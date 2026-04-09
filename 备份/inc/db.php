<?php
/**
 * 纵横四海 - 数据库操作类
 */

require_once __DIR__ . '/config.php';

class DB {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            $this->showError('数据库连接失败', $e->getMessage());
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function showError($title, $message) {
        http_response_code(500);
        echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>系统错误</title>';
        echo '<style>body{font-family:serif;background:#1a1a2e;color:#f5e6c8;text-align:center;padding:40px 20px;}h1{color:#e2b714;font-size:24px;}p{margin:10px 0;font-size:14px;}</style></head><body>';
        echo '<h1>⚓ ' . SITE_NAME . '</h1>';
        echo '<h2>' . htmlspecialchars($title) . '</h2>';
        echo '<p>' . htmlspecialchars($message) . '</p>';
        echo '<p>请联系管理员</p>';
        echo '</body></html>';
        exit;
    }

    /**
     * 获取单行数据
     */
    public function getOne($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }

    /**
     * 获取所有行
     */
    public function getAll($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * 获取单个值
     */
    public function getVar($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }

    /**
     * 插入数据
     */
    public function insert($table, $data) {
        $fields = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $sql = "INSERT INTO `{$table}` ({$fields}) VALUES ({$placeholders})";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_values($data));
        return $this->pdo->lastInsertId();
    }

    /**
     * 更新数据
     */
    public function update($table, $data, $where, $whereParams = []) {
        $set = implode(', ', array_map(function($field) {
            return "`{$field}` = ?";
        }, array_keys($data)));
        $sql = "UPDATE `{$table}` SET {$set} WHERE {$where}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_merge(array_values($data), $whereParams));
        return $stmt->rowCount();
    }

    /**
     * 删除数据
     */
    public function delete($table, $where, $params = []) {
        $sql = "DELETE FROM `{$table}` WHERE {$where}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * 执行原始SQL
     */
    public function query($sql, $params = []) {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /**
     * 获取PDO实例
     */
    public function pdo() {
        return $this->pdo;
    }
}

/**
 * 快捷函数
 */
function db() {
    return DB::getInstance();
}
