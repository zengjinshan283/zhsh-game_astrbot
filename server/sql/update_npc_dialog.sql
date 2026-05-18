-- ============================================================
-- NPC 对话文本：角色定位式（每个NPC一条）
-- 格式：我是谁 + 我能给你什么任务/服务
-- ============================================================

-- 威尼斯基础NPC
UPDATE npc SET dialog = '我是马可，威尼斯酒馆老板。码头附近野狗成患，有空帮我清理一下。' WHERE id = 1;
UPDATE npc SET dialog = '我是安芬尼奥，装备强化商。雅典那边商路不太平，你可以来找我接任务。' WHERE id = 2;
UPDATE npc SET dialog = '我是银行家，存钱收10%年利息。钱放身上容易丢，放我这儿最安全。' WHERE id = 3;
UPDATE npc SET dialog = '我是赌场老板，试试手气？赢了金币归你，输了别怨我。' WHERE id = 4;
UPDATE npc SET dialog = '我是东方商人，卖各种杂货。需要什么来市场找我，价格公道。' WHERE id = 5;

-- 威尼斯城市功能NPC
UPDATE npc SET dialog = '我是威尼斯码头长，想出海就来我这儿买船票。码头附近有海盗骚扰商队。' WHERE id = 1000;
UPDATE npc SET dialog = '我是威尼斯商人，市场里找我看货。' WHERE id = 1001;
UPDATE npc SET dialog = '我是威尼斯铁匠，想强化装备来找我。' WHERE id = 1002;
UPDATE npc SET dialog = '我是威尼斯酒馆老板，里边请！一杯麦酒10铜币，酒馆消息灵通。' WHERE id = 1003;
UPDATE npc SET dialog = '我是威尼斯旅店掌柜，住宿一晚50铜币，休息后HP和状态全满。' WHERE id = 1004;
UPDATE npc SET dialog = '我是威尼斯银行家，存钱收10%年利息，安全可靠。' WHERE id = 1005;
UPDATE npc SET dialog = '我是威尼斯赏金猎人，有份悬赏令专杀指定怪物，佣金丰厚。' WHERE id = 1006;

-- 雅典城市功能NPC
UPDATE npc SET dialog = '我是雅典码头长，想出海来我这儿买票。雅典商路最近被海盗骚扰。' WHERE id = 1007;
UPDATE npc SET dialog = '我是雅典商人，市场里找我。' WHERE id = 1008;
UPDATE npc SET dialog = '我是雅典铁匠，强化装备来找我。' WHERE id = 1009;
UPDATE npc SET dialog = '我是雅典酒馆老板，里边请！一杯麦酒10铜币。' WHERE id = 1010;
UPDATE npc SET dialog = '我是雅典旅店掌柜，住宿50铜币/晚，休息后状态全满。' WHERE id = 1011;
UPDATE npc SET dialog = '我是雅典银行家，存款利息10%/年。' WHERE id = 1012;
UPDATE npc SET dialog = '我是雅典赏金猎人，有悬赏任务专杀指定怪物，佣金丰厚。' WHERE id = 1013;

-- 亚历山大城市功能NPC
UPDATE npc SET dialog = '我是亚历山大码头长，欢迎来到埃及！出港口在这儿。' WHERE id = 1014;
UPDATE npc SET dialog = '我是亚历山大商人，市场里找我。' WHERE id = 1015;
UPDATE npc SET dialog = '我是亚历山大铁匠，强化装备来找我。' WHERE id = 1016;
UPDATE npc SET dialog = '我是亚历山大酒馆老板，沙漠旅行辛苦了吧，里边请！' WHERE id = 1017;
UPDATE npc SET dialog = '我是亚历山大旅店掌柜，住宿50铜币/晚。' WHERE id = 1018;
UPDATE npc SET dialog = '我是亚历山大银行家，存款利息10%/年。' WHERE id = 1019;
UPDATE npc SET dialog = '我是亚历山大赏金猎人，沙漠野兽和海盗是主要悬赏目标。' WHERE id = 1020;

-- 南特城市功能NPC
UPDATE npc SET dialog = '我是南特码头长，出发来买票！北大西洋航线有海盗出没。' WHERE id = 1021;
UPDATE npc SET dialog = '我是南特商人，市场里找我。' WHERE id = 1022;
UPDATE npc SET dialog = '我是南特铁匠，强化装备来找我。' WHERE id = 1023;
UPDATE npc SET dialog = '我是南特酒馆老板，里边请！' WHERE id = 1024;
UPDATE npc SET dialog = '我是南特旅店掌柜，住宿50铜币/晚。' WHERE id = 1025;
UPDATE npc SET dialog = '我是南特银行家，存款利息10%/年。' WHERE id = 1026;
UPDATE npc SET dialog = '我是南特赏金猎人，北海海怪和海盗是悬赏目标。' WHERE id = 1027;

-- 伦敦城市功能NPC
UPDATE npc SET dialog = '我是伦敦码头长，要出海来买票。北海航线危险，海盗猖獗。' WHERE id = 1028;
UPDATE npc SET dialog = '我是伦敦商人，市场里找我。' WHERE id = 1029;
UPDATE npc SET dialog = '我是伦敦铁匠，强化装备来找我。' WHERE id = 1030;
UPDATE npc SET dialog = '我是伦敦酒馆老板，里边请！' WHERE id = 1031;
UPDATE npc SET dialog = '我是伦敦旅店掌柜，住宿50铜币/晚。' WHERE id = 1032;
UPDATE npc SET dialog = '我是伦敦银行家，存款利息10%/年。' WHERE id = 1033;
UPDATE npc SET dialog = '我是伦敦赏金猎人，北海航线需要你们！' WHERE id = 1034;

-- 爱丁堡城市功能NPC
UPDATE npc SET dialog = '我是爱丁堡码头长，要出海来买票。苏格兰北海岸欢迎你。' WHERE id = 1035;
UPDATE npc SET dialog = '我是爱丁堡商人，市场里找我。' WHERE id = 1036;
UPDATE npc SET dialog = '我是爱丁堡铁匠，强化装备来找我。' WHERE id = 1037;
UPDATE npc SET dialog = '我是爱丁堡酒馆老板，里边请！' WHERE id = 1038;
UPDATE npc SET dialog = '我是爱丁堡旅店掌柜，住宿50铜币/晚。' WHERE id = 1039;
UPDATE npc SET dialog = '我是爱丁堡银行家，存款利息10%/年。' WHERE id = 1040;
UPDATE npc SET dialog = '我是爱丁堡赏金猎人，有悬赏任务给你。' WHERE id = 1041;

-- 阿姆斯特丹城市功能NPC
UPDATE npc SET dialog = '我是阿姆斯特丹码头长，要出海来买票。低地国之都欢迎你。' WHERE id = 1042;
UPDATE npc SET dialog = '我是阿姆斯特丹商人，市场里找我。' WHERE id = 1043;
UPDATE npc SET dialog = '我是阿姆斯特丹铁匠，强化装备来找我。' WHERE id = 1044;
UPDATE npc SET dialog = '我是阿姆斯特丹酒馆老板，里边请！' WHERE id = 1045;
UPDATE npc SET dialog = '我是阿姆斯特丹旅店掌柜，住宿50铜币/晚。' WHERE id = 1046;
UPDATE npc SET dialog = '我是阿姆斯特丹银行家，存款利息10%/年。' WHERE id = 1047;
UPDATE npc SET dialog = '我是阿姆斯特丹赏金猎人，有悬赏任务给你。' WHERE id = 1048;
