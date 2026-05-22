-- 17城市支线任务填充 (卢旺达/开普敦/亚特兰蒂斯/莫桑比克/马达加斯加/蒙巴萨/马六甲/广州/泉州/杭州/扬州/长安/亚丁/荷姆兹/锡兰/孟买/诺萨德)

-- 打怪/收集/探索/护送/悬赏 (type 1/3/5/6/7)
UPDATE quest SET target_id=61, description='在卢旺达城外击败5只森林狼，完成狩猎任务。' WHERE id=1096 AND type=1;
UPDATE quest SET target_id=58, description='在卢旺达收集3份琥珀，交给1096号NPC。' WHERE id=1098 AND type=3;
UPDATE quest SET target_id=1201, description='探索卢旺达附近的遗迹，寻找隐藏的宝物。' WHERE id=1100 AND type=5;
UPDATE quest SET target_id=1097, description='护送1097号NPC安全抵达目的地。' WHERE id=1101 AND type=6;
UPDATE quest SET target_id=61, description='击杀森林狼，完成卢旺达城的悬赏任务。' WHERE id=1102 AND type=7;

UPDATE quest SET target_id=21, description='在开普敦城外击败5只草原狮，完成狩猎任务。' WHERE id=1104 AND type=1;
UPDATE quest SET target_id=51, description='在开普敦收集3份煤炭，交给1104号NPC。' WHERE id=1106 AND type=3;
UPDATE quest SET target_id=1301, description='探索开普敦附近的遗迹，寻找隐藏的宝物。' WHERE id=1108 AND type=5;
UPDATE quest SET target_id=1105, description='护送1105号NPC安全抵达目的地。' WHERE id=1109 AND type=6;
UPDATE quest SET target_id=21, description='击杀草原狮，完成开普敦城的悬赏任务。' WHERE id=1110 AND type=7;

UPDATE quest SET target_id=121, description='在亚特兰蒂斯城外击败5只海豹，完成狩猎任务。' WHERE id=1112 AND type=1;
UPDATE quest SET target_id=57, description='在亚特兰蒂斯收集3份珍珠，交给1112号NPC。' WHERE id=1114 AND type=3;
UPDATE quest SET target_id=1401, description='探索亚特兰蒂斯附近的遗迹，寻找隐藏的宝物。' WHERE id=1116 AND type=5;
UPDATE quest SET target_id=1113, description='护送1113号NPC安全抵达目的地。' WHERE id=1117 AND type=6;
UPDATE quest SET target_id=121, description='击杀海豹，完成亚特兰蒂斯城的悬赏任务。' WHERE id=1118 AND type=7;

UPDATE quest SET target_id=21, description='在莫桑比克城外击败5只草原狮，完成狩猎任务。' WHERE id=1120 AND type=1;
UPDATE quest SET target_id=58, description='在莫桑比克收集3份琥珀，交给1120号NPC。' WHERE id=1122 AND type=3;
UPDATE quest SET target_id=1501, description='探索莫桑比克附近的遗迹，寻找隐藏的宝物。' WHERE id=1124 AND type=5;
UPDATE quest SET target_id=1121, description='护送1121号NPC安全抵达目的地。' WHERE id=1125 AND type=6;
UPDATE quest SET target_id=21, description='击杀草原狮，完成莫桑比克城的悬赏任务。' WHERE id=1126 AND type=7;

UPDATE quest SET target_id=141, description='在马达加斯加城外击败5只鳄鱼，完成狩猎任务。' WHERE id=1128 AND type=1;
UPDATE quest SET target_id=59, description='在马达加斯加收集3份水晶，交给1128号NPC。' WHERE id=1130 AND type=3;
UPDATE quest SET target_id=1601, description='探索马达加斯加附近的遗迹，寻找隐藏的宝物。' WHERE id=1132 AND type=5;
UPDATE quest SET target_id=1129, description='护送1129号NPC安全抵达目的地。' WHERE id=1133 AND type=6;
UPDATE quest SET target_id=141, description='击杀鳄鱼，完成马达加斯加城的悬赏任务。' WHERE id=1134 AND type=7;

UPDATE quest SET target_id=31, description='在蒙巴萨城外击败5只鳄鱼，完成狩猎任务。' WHERE id=1136 AND type=1;
UPDATE quest SET target_id=52, description='在蒙巴萨收集3份翡翠石，交给1136号NPC。' WHERE id=1138 AND type=3;
UPDATE quest SET target_id=1701, description='探索蒙巴萨附近的遗迹，寻找隐藏的宝物。' WHERE id=1140 AND type=5;
UPDATE quest SET target_id=1137, description='护送1137号NPC安全抵达目的地。' WHERE id=1141 AND type=6;
UPDATE quest SET target_id=31, description='击杀鳄鱼，完成蒙巴萨城的悬赏任务。' WHERE id=1142 AND type=7;

UPDATE quest SET target_id=41, description='在马六甲城外击败5只巨蟒，完成狩猎任务。' WHERE id=1144 AND type=1;
UPDATE quest SET target_id=53, description='在马六甲收集3份银矿石，交给1144号NPC。' WHERE id=1146 AND type=3;
UPDATE quest SET target_id=1801, description='探索马六甲附近的遗迹，寻找隐藏的宝物。' WHERE id=1148 AND type=5;
UPDATE quest SET target_id=1145, description='护送1145号NPC安全抵达目的地。' WHERE id=1149 AND type=6;
UPDATE quest SET target_id=41, description='击杀巨蟒，完成马六甲城的悬赏任务。' WHERE id=1150 AND type=7;

UPDATE quest SET target_id=181, description='在广州城外击败5只华南虎，完成狩猎任务。' WHERE id=1152 AND type=1;
UPDATE quest SET target_id=200, description='在广州收集3份中国丝绸，交给1152号NPC。' WHERE id=1154 AND type=3;
UPDATE quest SET target_id=1901, description='探索广州附近的遗迹，寻找隐藏的宝物。' WHERE id=1156 AND type=5;
UPDATE quest SET target_id=1153, description='护送1153号NPC安全抵达目的地。' WHERE id=1157 AND type=6;
UPDATE quest SET target_id=181, description='击杀华南虎，完成广州城的悬赏任务。' WHERE id=1158 AND type=7;

UPDATE quest SET target_id=181, description='在泉州城外击败5只华南虎，完成狩猎任务。' WHERE id=1160 AND type=1;
UPDATE quest SET target_id=201, description='在泉州收集3份瓷器，交给1160号NPC。' WHERE id=1162 AND type=3;
UPDATE quest SET target_id=2001, description='探索泉州附近的遗迹，寻找隐藏的宝物。' WHERE id=1164 AND type=5;
UPDATE quest SET target_id=1161, description='护送1161号NPC安全抵达目的地。' WHERE id=1165 AND type=6;
UPDATE quest SET target_id=181, description='击杀华南虎，完成泉州城的悬赏任务。' WHERE id=1166 AND type=7;

UPDATE quest SET target_id=181, description='在杭州城外击败5只华南虎，完成狩猎任务。' WHERE id=1168 AND type=1;
UPDATE quest SET target_id=201, description='在杭州收集3份瓷器，交给1168号NPC。' WHERE id=1170 AND type=3;
UPDATE quest SET target_id=2101, description='探索杭州附近的遗迹，寻找隐藏的宝物。' WHERE id=1172 AND type=5;
UPDATE quest SET target_id=1169, description='护送1169号NPC安全抵达目的地。' WHERE id=1173 AND type=6;
UPDATE quest SET target_id=181, description='击杀华南虎，完成杭州城的悬赏任务。' WHERE id=1174 AND type=7;

UPDATE quest SET target_id=181, description='在扬州城外击败5只华南虎，完成狩猎任务。' WHERE id=1176 AND type=1;
UPDATE quest SET target_id=200, description='在扬州收集3份中国丝绸，交给1176号NPC。' WHERE id=1178 AND type=3;
UPDATE quest SET target_id=2201, description='探索扬州附近的遗迹，寻找隐藏的宝物。' WHERE id=1180 AND type=5;
UPDATE quest SET target_id=1177, description='护送1177号NPC安全抵达目的地。' WHERE id=1181 AND type=6;
UPDATE quest SET target_id=181, description='击杀华南虎，完成扬州城的悬赏任务。' WHERE id=1182 AND type=7;

UPDATE quest SET target_id=182, description='在长安城外击败5只野猪，完成狩猎任务。' WHERE id=1184 AND type=1;
UPDATE quest SET target_id=202, description='在长安收集3份玉石，交给1184号NPC。' WHERE id=1186 AND type=3;
UPDATE quest SET target_id=2301, description='探索长安附近的遗迹，寻找隐藏的宝物。' WHERE id=1188 AND type=5;
UPDATE quest SET target_id=1185, description='护送1185号NPC安全抵达目的地。' WHERE id=1189 AND type=6;
UPDATE quest SET target_id=182, description='击杀野猪，完成长安城的悬赏任务。' WHERE id=1190 AND type=7;

UPDATE quest SET target_id=31, description='在亚丁城外击败5只鳄鱼，完成狩猎任务。' WHERE id=1192 AND type=1;
UPDATE quest SET target_id=52, description='在亚丁收集3份翡翠石，交给1192号NPC。' WHERE id=1194 AND type=3;
UPDATE quest SET target_id=2401, description='探索亚丁附近的遗迹，寻找隐藏的宝物。' WHERE id=1196 AND type=5;
UPDATE quest SET target_id=1193, description='护送1193号NPC安全抵达目的地。' WHERE id=1197 AND type=6;
UPDATE quest SET target_id=31, description='击杀鳄鱼，完成亚丁城的悬赏任务。' WHERE id=1198 AND type=7;

UPDATE quest SET target_id=41, description='在荷姆兹城外击败5只巨蟒，完成狩猎任务。' WHERE id=1200 AND type=1;
UPDATE quest SET target_id=53, description='在荷姆兹收集3份银矿石，交给1200号NPC。' WHERE id=1202 AND type=3;
UPDATE quest SET target_id=2501, description='探索荷姆兹附近的遗迹，寻找隐藏的宝物。' WHERE id=1204 AND type=5;
UPDATE quest SET target_id=1201, description='护送1201号NPC安全抵达目的地。' WHERE id=1205 AND type=6;
UPDATE quest SET target_id=41, description='击杀巨蟒，完成荷姆兹城的悬赏任务。' WHERE id=1206 AND type=7;

UPDATE quest SET target_id=161, description='在锡兰城外击败5只毒蛇，完成狩猎任务。' WHERE id=1208 AND type=1;
UPDATE quest SET target_id=59, description='在锡兰收集3份水晶，交给1208号NPC。' WHERE id=1210 AND type=3;
UPDATE quest SET target_id=2601, description='探索锡兰附近的遗迹，寻找隐藏的宝物。' WHERE id=1212 AND type=5;
UPDATE quest SET target_id=1209, description='护送1209号NPC安全抵达目的地。' WHERE id=1213 AND type=6;
UPDATE quest SET target_id=161, description='击杀毒蛇，完成锡兰城的悬赏任务。' WHERE id=1214 AND type=7;

UPDATE quest SET target_id=81, description='在孟买城外击败5只棕熊，完成狩猎任务。' WHERE id=1216 AND type=1;
UPDATE quest SET target_id=54, description='在孟买收集3份玄铁石，交给1216号NPC。' WHERE id=1218 AND type=3;
UPDATE quest SET target_id=2701, description='探索孟买附近的遗迹，寻找隐藏的宝物。' WHERE id=1220 AND type=5;
UPDATE quest SET target_id=1217, description='护送1217号NPC安全抵达目的地。' WHERE id=1221 AND type=6;
UPDATE quest SET target_id=81, description='击杀棕熊，完成孟买城的悬赏任务。' WHERE id=1222 AND type=7;

UPDATE quest SET target_id=91, description='在诺萨德城外击败5只雪豹，完成狩猎任务。' WHERE id=1224 AND type=1;
UPDATE quest SET target_id=55, description='在诺萨德收集3份硫磺，交给1224号NPC。' WHERE id=1226 AND type=3;
UPDATE quest SET target_id=2801, description='探索诺萨德附近的遗迹，寻找隐藏的宝物。' WHERE id=1228 AND type=5;
UPDATE quest SET target_id=1225, description='护送1225号NPC安全抵达目的地。' WHERE id=1229 AND type=6;
UPDATE quest SET target_id=91, description='击杀雪豹，完成诺萨德城的悬赏任务。' WHERE id=1230 AND type=7;

-- 送信/跑商/对话 (type 2/4/8)
UPDATE quest SET target_id=1301, description='将信件从卢旺达送到开普敦的NPC处。' WHERE id=1097 AND type=2;
UPDATE quest SET target_id=1301, description='从卢旺达运送货物到开普敦出售，赚取差价。' WHERE id=1099 AND type=4;
UPDATE quest SET target_id=1097, description='与卢旺达码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1103 AND type=8;

UPDATE quest SET target_id=1401, description='将信件从开普敦送到亚特兰蒂斯的NPC处。' WHERE id=1105 AND type=2;
UPDATE quest SET target_id=1401, description='从开普敦运送货物到亚特兰蒂斯出售，赚取差价。' WHERE id=1107 AND type=4;
UPDATE quest SET target_id=1105, description='与开普敦码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1111 AND type=8;

UPDATE quest SET target_id=1501, description='将信件从亚特兰蒂斯送到莫桑比克的NPC处。' WHERE id=1113 AND type=2;
UPDATE quest SET target_id=1501, description='从亚特兰蒂斯运送货物到莫桑比克出售，赚取差价。' WHERE id=1115 AND type=4;
UPDATE quest SET target_id=1113, description='与亚特兰蒂斯码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1119 AND type=8;

UPDATE quest SET target_id=1601, description='将信件从莫桑比克送到马达加斯加的NPC处。' WHERE id=1121 AND type=2;
UPDATE quest SET target_id=1601, description='从莫桑比克运送货物到马达加斯加出售，赚取差价。' WHERE id=1123 AND type=4;
UPDATE quest SET target_id=1121, description='与莫桑比克码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1127 AND type=8;

UPDATE quest SET target_id=1701, description='将信件从马达加斯加送到蒙巴萨的NPC处。' WHERE id=1129 AND type=2;
UPDATE quest SET target_id=1701, description='从马达加斯加运送货物到蒙巴萨出售，赚取差价。' WHERE id=1131 AND type=4;
UPDATE quest SET target_id=1129, description='与马达加斯加码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1135 AND type=8;

UPDATE quest SET target_id=1801, description='将信件从蒙巴萨送到马六甲的NPC处。' WHERE id=1137 AND type=2;
UPDATE quest SET target_id=1801, description='从蒙巴萨运送货物到马六甲出售，赚取差价。' WHERE id=1139 AND type=4;
UPDATE quest SET target_id=1137, description='与蒙巴萨码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1143 AND type=8;

UPDATE quest SET target_id=1901, description='将信件从马六甲送到广州的NPC处。' WHERE id=1145 AND type=2;
UPDATE quest SET target_id=1901, description='从马六甲运送货物到广州出售，赚取差价。' WHERE id=1147 AND type=4;
UPDATE quest SET target_id=1145, description='与马六甲码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1151 AND type=8;

UPDATE quest SET target_id=2001, description='将信件从广州送到泉州的NPC处。' WHERE id=1153 AND type=2;
UPDATE quest SET target_id=2001, description='从广州运送货物到泉州出售，赚取差价。' WHERE id=1155 AND type=4;
UPDATE quest SET target_id=1153, description='与广州码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1159 AND type=8;

UPDATE quest SET target_id=2101, description='将信件从泉州送到杭州的NPC处。' WHERE id=1161 AND type=2;
UPDATE quest SET target_id=2101, description='从泉州运送货物到杭州出售，赚取差价。' WHERE id=1163 AND type=4;
UPDATE quest SET target_id=1161, description='与泉州码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1167 AND type=8;

UPDATE quest SET target_id=2201, description='将信件从杭州送到扬州的NPC处。' WHERE id=1169 AND type=2;
UPDATE quest SET target_id=2201, description='从杭州运送货物到扬州出售，赚取差价。' WHERE id=1171 AND type=4;
UPDATE quest SET target_id=1169, description='与杭州码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1175 AND type=8;

UPDATE quest SET target_id=2301, description='将信件从扬州送到长安的NPC处。' WHERE id=1177 AND type=2;
UPDATE quest SET target_id=2301, description='从扬州运送货物到长安出售，赚取差价。' WHERE id=1179 AND type=4;
UPDATE quest SET target_id=1177, description='与扬州码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1183 AND type=8;

UPDATE quest SET target_id=2401, description='将信件从长安送到亚丁的NPC处。' WHERE id=1185 AND type=2;
UPDATE quest SET target_id=2401, description='从长安运送货物到亚丁出售，赚取差价。' WHERE id=1187 AND type=4;
UPDATE quest SET target_id=1185, description='与长安码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1191 AND type=8;

UPDATE quest SET target_id=2501, description='将信件从亚丁送到荷姆兹的NPC处。' WHERE id=1193 AND type=2;
UPDATE quest SET target_id=2501, description='从亚丁运送货物到荷姆兹出售，赚取差价。' WHERE id=1195 AND type=4;
UPDATE quest SET target_id=1193, description='与亚丁码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1199 AND type=8;

UPDATE quest SET target_id=2601, description='将信件从荷姆兹送到锡兰的NPC处。' WHERE id=1201 AND type=2;
UPDATE quest SET target_id=2601, description='从荷姆兹运送货物到锡兰出售，赚取差价。' WHERE id=1203 AND type=4;
UPDATE quest SET target_id=1201, description='与荷姆兹码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1207 AND type=8;

UPDATE quest SET target_id=2701, description='将信件从锡兰送到孟买的NPC处。' WHERE id=1209 AND type=2;
UPDATE quest SET target_id=2701, description='从锡兰运送货物到孟买出售，赚取差价。' WHERE id=1211 AND type=4;
UPDATE quest SET target_id=1209, description='与锡兰码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1215 AND type=8;

UPDATE quest SET target_id=2801, description='将信件从孟买送到诺萨德的NPC处。' WHERE id=1217 AND type=2;
UPDATE quest SET target_id=2801, description='从孟买运送货物到诺萨德出售，赚取差价。' WHERE id=1219 AND type=4;
UPDATE quest SET target_id=1217, description='与孟买码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1223 AND type=8;

UPDATE quest SET target_id=1201, description='将信件从诺萨德送到卢旺达的NPC处。' WHERE id=1225 AND type=2;
UPDATE quest SET target_id=1201, description='从诺萨德运送货物到卢旺达出售，赚取差价。' WHERE id=1227 AND type=4;
UPDATE quest SET target_id=1225, description='与诺萨德码头的NPC对话，了解最新的航线和物价信息。' WHERE id=1231 AND type=8;
