<?php
/**
 * WebSocket Server - PHP Native Sockets
 * Usage: php ws/server.php start|stop|restart
 */
require_once __DIR__ . '/Handler.php';
require_once __DIR__ . '/RoomManager.php';
require_once __DIR__ . '/handlers/AuthHandler.php';
require_once __DIR__ . '/handlers/ChatHandler.php';
require_once __DIR__ . '/handlers/MoveHandler.php';
require_once __DIR__ . '/handlers/BattleHandler.php';
require_once __DIR__ . '/handlers/SailHandler.php';
require_once __DIR__ . '/handlers/NpcHandler.php';

class WsServer {
    private $host = '0.0.0.0';
    private $port = 8282;
    private $master;
    private $sockets = [];
    private $users = [];
    private $connections = [];
    private $onlineList = [];
    private $battleStates = [];
    private $pidFile;

    public function __construct() {
        $this->pidFile = __DIR__ . '/server.pid';
        require_once dirname(__DIR__) . '/inc/db.php';
        require_once dirname(__DIR__) . '/inc/config.php';
        require_once dirname(__DIR__) . '/inc/role.php';
    }

    public function start() {
        $this->log("Starting WS server on {$this->host}:{$this->port}");
        $this->master = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        if (!$this->master) { $this->log("socket_create failed"); return; }
        socket_set_option($this->master, SOL_SOCKET, SO_REUSEADDR, 1);
        socket_bind($this->master, $this->host, $this->port);
        socket_listen($this->master, 128);
        socket_set_nonblock($this->master);
        $this->sockets[] = $this->master;
        file_put_contents($this->pidFile, getmypid());
        pcntl_async_signals(true);
        pcntl_signal(SIGTERM, [$this, 'shutdown']);
        pcntl_signal(SIGINT, [$this, 'shutdown']);
        $this->log("Server started PID:" . getmypid());
        $lastPing = time(); $lastSync = time();
        while (true) {
            pcntl_signal_dispatch();
            $read = $this->sockets; $w = null; $e = null;
            $changed = @socket_select($read, $w, $e, 2);
            if ($changed === false) continue;
            foreach ($read as $socket) {
                if ($socket === $this->master) {
                    $client = socket_accept($this->master);
                    if ($client) {
                        socket_set_nonblock($client);
                        $fd = (int)$client;
                        $this->sockets[$fd] = $client;
                        $this->connections[$fd] = ['handshaked' => false, 'buffer' => '', 'user' => null, 'lastPing' => time()];
                    }
                } else {
                    $fd = (int)$socket;
                    $data = @socket_read($socket, 8192);
                    if ($data === false || $data === '') { $this->disconnect($fd); }
                    else { $this->onData($fd, $data); }
                }
            }
            $now = time();
            if ($now - $lastPing >= 30) { $lastPing = $now; $this->pingCheck($now); }
            if ($now - $lastSync >= 60) { $lastSync = $now; $this->syncOnline(); }
        }
    }

    private function onData($fd, $data) {
        if (!isset($this->connections[$fd])) return;
        if (!$this->connections[$fd]['handshaked']) {
            $this->connections[$fd]['buffer'] .= $data;
            if (strpos($this->connections[$fd]['buffer'], "\r\n\r\n") !== false) {
                $this->doHandshake($fd, $this->connections[$fd]['buffer']);
            }
            return;
        }
        $this->connections[$fd]['lastPing'] = time();
        foreach ($this->decode($data) as $msg) {
            if ($msg !== null) $this->onMessage($fd, $msg);
        }
    }

    private function doHandshake($fd, $buffer) {
        $headers = [];
        foreach (explode("\r\n", $buffer) as $i => $line) {
            if ($i === 0) continue;
            $line = trim($line);
            if (empty($line)) continue;
            $p = explode(':', $line, 2);
            if (count($p) === 2) $headers[strtolower(trim($p[0]))] = trim($p[1]);
        }
        if (!isset($headers['sec-websocket-key'])) { $this->disconnect($fd); return; }
        $key = $headers['sec-websocket-key'] . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
        $accept = base64_encode(sha1($key, true));
        $upgrade = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {$accept}\r\n\r\n";
        @socket_write($this->sockets[$fd], $upgrade, strlen($upgrade));
        $this->connections[$fd]['handshaked'] = true;
        $this->connections[$fd]['buffer'] = '';
    }

    private function onMessage($fd, $msg) {
        $data = json_decode($msg, true);
        if (!$data || !isset($data['type'])) return;
        $handler = Handler::getHandler($data['type']);
        if ($handler) $handler->handle($this, $fd, $data);
    }

    public function send($fd, $data) {
        if (!isset($this->sockets[$fd]) || !isset($this->connections[$fd]) || !$this->connections[$fd]['handshaked']) return false;
        $json = json_encode($data, JSON_UNESCAPED_UNICODE);
        if ($json === false) return false;
        $frame = $this->encode($json);
        return @socket_write($this->sockets[$fd], $frame, strlen($frame)) !== false;
    }

    public function sendToUser($userId, $data) {
        return isset($this->onlineList[$userId]) ? $this->send($this->onlineList[$userId], $data) : false;
    }

    public function broadcast($data, $excludeFd = null) {
        foreach ($this->connections as $fd => $c) {
            if ($fd === $excludeFd || !$c['handshaked']) continue;
            $this->send($fd, $data);
        }
    }

    public function broadcastToRoom($placeId, $data, $excludeUserId = 0) {
        foreach ($this->users as $fd => $uid) {
            if ($uid == $excludeUserId) continue;
            $u = $this->getUser($fd);
            if ($u && $u->place_id == $placeId) $this->send($fd, $data);
        }
    }

    public function authenticate($fd, $sid) {
        $role = new Role();
        if ($role->loadBySid($sid)) {
            $this->users[$fd] = $role->id;
            $this->connections[$fd]['user'] = $role;
            $this->onlineList[$role->id] = $fd;
            foreach ($this->users as $oldFd => $uid) {
                if ($uid == $role->id && $oldFd != $fd) {
                    $this->send($oldFd, ['type' => 'kicked', 'data' => ['text' => '你在其他地方登录了']]);
                    $this->disconnect($oldFd);
                }
            }
            return $role;
        }
        return null;
    }

    public function getUser($fd) { return $this->connections[$fd]['user'] ?? null; }
    public function getUserId($fd) { return $this->users[$fd] ?? 0; }
    public function isAuthenticated($fd) { return isset($this->users[$fd]); }
    public function getOnlineCount() { return count($this->onlineList); }
    public function getOnlineUserIds() { return array_keys($this->onlineList); }

    public function getFdsByPlace($placeId) {
        $fds = [];
        foreach ($this->users as $fd => $uid) {
            $u = $this->getUser($fd);
            if ($u && $u->place_id == $placeId) $fds[$fd] = $uid;
        }
        return $fds;
    }

    public function setBattleState($userId, $data) { $this->battleStates[$userId] = $data; }
    public function getBattleState($userId) { return $this->battleStates[$userId] ?? null; }
    public function clearBattleState($userId) { unset($this->battleStates[$userId]); }

    private function disconnect($fd) {
        if (!isset($this->connections[$fd])) return;
        if (isset($this->users[$fd])) {
            $uid = $this->users[$fd];
            $u = $this->getUser($fd);
            if ($u) $this->broadcastToRoom($u->place_id, ['type' => 'player_left', 'data' => ['user_id' => $uid, 'username' => $u->username]], $uid);
            unset($this->onlineList[$uid]); unset($this->battleStates[$uid]); unset($this->users[$fd]);
        }
        @socket_close($this->sockets[$fd]);
        unset($this->sockets[$fd]); unset($this->connections[$fd]);
    }

    private function pingCheck($now) {
        foreach ($this->connections as $fd => $c) {
            if (!$c['handshaked']) { if ($now - $c['lastPing'] > 60) $this->disconnect($fd); continue; }
            if ($now - $c['lastPing'] > 90) $this->disconnect($fd);
        }
    }

    private function syncOnline() {
        foreach ($this->onlineList as $uid => $fd) {
            db()->update('user', ['lastdate' => time()], '`id` = ?', [$uid]);
        }
        $this->broadcast(['type' => 'online_update', 'data' => ['online_count' => $this->getOnlineCount()]]);
    }

    private function encode($payload) {
        $len = strlen($payload); $frame = chr(0x81);
        if ($len < 126) $frame .= chr($len);
        elseif ($len < 65536) $frame .= chr(126) . pack('n', $len);
        else $frame .= chr(127) . pack('J', $len);
        return $frame . $payload;
    }

    private function decode($raw) {
        $msgs = []; $off = 0; $len = strlen($raw);
        while ($off < $len) {
            if ($off + 2 > $len) break;
            $b1 = ord($raw[$off]); $b2 = ord($raw[$off+1]);
            $op = $b1 & 0x0F; $masked = ($b2 & 0x80) >> 7; $pl = $b2 & 0x7F; $off += 2;
            if ($pl === 126) { if ($off+2>$len) break; $pl = unpack('n',substr($raw,$off,2))[1]; $off+=2; }
            elseif ($pl === 127) { if ($off+8>$len) break; $pl = unpack('J',substr($raw,$off,8))[1]; $off+=8; }
            $mk = '';
            if ($masked) { if ($off+4>$len) break; $mk = substr($raw,$off,4); $off+=4; }
            if ($off+$pl>$len) break;
            $payload = substr($raw,$off,$pl); $off += $pl;
            if ($masked && $mk) { for($i=0;$i<$pl;$i++) $payload[$i]=chr(ord($payload[$i])^ord($mk[$i%4])); }
            if ($op===0x8) break;
            if ($op===0x9||$op===0xA) continue;
            if ($op===0x1||$op===0x2) $msgs[] = $payload;
        }
        return $msgs;
    }

    public function shutdown($signo = 0) {
        $this->log("Shutting down...");
        foreach ($this->sockets as $fd => $s) { if ($fd !== 0) @socket_close($s); }
        @socket_close($this->master); @unlink($this->pidFile); exit(0);
    }

    private function log($msg) {
        file_put_contents(__DIR__ . '/server.log', "[".date('Y-m-d H:i:s')."] $msg\n", FILE_APPEND);
    }
}

if (php_sapi_name() !== 'cli') { echo "CLI only\n"; exit(1); }
$server = new WsServer();
switch ($argv[1] ?? 'start') {
    case 'start':
        if (file_exists(__DIR__.'/server.pid')) { $p=(int)file_get_contents(__DIR__.'/server.pid'); if($p>0&&posix_kill($p,0)){echo"Already running PID:$p\n";exit(1);} }
        file_put_contents(__DIR__ . '/server.log', '');
        $server->start(); break;
    case 'stop':
        $f=__DIR__.'/server.pid'; if(file_exists($f)){$p=(int)file_get_contents($f);posix_kill($p,SIGTERM);@unlink($f);echo"Stopped\n";} break;
    case 'restart':
        $f=__DIR__.'/server.pid'; if(file_exists($f)){posix_kill((int)file_get_contents($f),SIGTERM);sleep(1);}
        file_put_contents(__DIR__ . '/server.log', ''); $server->start(); break;
    default: echo "Usage: php server.php [start|stop|restart]\n";
}
