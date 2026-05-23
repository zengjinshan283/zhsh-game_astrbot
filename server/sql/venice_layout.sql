-- 威尼斯城市地图合理布局 (7×7)
-- 城门四角，码头南边，商业街横贯东西，广场中心

UPDATE place SET pos_row=0, pos_col=3 WHERE id=20001; -- 北城门
UPDATE place SET pos_row=6, pos_col=3 WHERE id=1023;  -- 南城门
UPDATE place SET pos_row=3, pos_col=0 WHERE id=1027;  -- 西城门
UPDATE place SET pos_row=3, pos_col=6 WHERE id=20002; -- 东城门

-- 第0行(北)：北城门东西两边
UPDATE place SET pos_row=0, pos_col=1 WHERE id=1016; -- 福利院(北)
UPDATE place SET pos_row=0, pos_col=2 WHERE id=1033; -- 占星屋(北)
UPDATE place SET pos_row=0, pos_col=4 WHERE id=1018; -- 居民区(北)
UPDATE place SET pos_row=0, pos_col=5 WHERE id=1019; -- 警察局(北)

-- 第1行：商业街北侧
UPDATE place SET pos_row=1, pos_col=0 WHERE id=1014; -- 铁匠铺(西)
UPDATE place SET pos_row=1, pos_col=1 WHERE id=1012; -- 商业街(西)
UPDATE place SET pos_row=1, pos_col=2 WHERE id=1020; -- 广场
UPDATE place SET pos_row=1, pos_col=4 WHERE id=1024; -- 银行
UPDATE place SET pos_row=1, pos_col=5 WHERE id=1030; -- 商业街(东)
UPDATE place SET pos_row=1, pos_col=6 WHERE id=1017; -- 教堂(东)

-- 第2行：码头(南侧)
UPDATE place SET pos_row=2, pos_col=0 WHERE id=1031; -- 铁匠铺(西2)
UPDATE place SET pos_row=2, pos_col=1 WHERE id=1028; -- 市场
UPDATE place SET pos_row=2, pos_col=2 WHERE id=1025; -- 农场
UPDATE place SET pos_row=2, pos_col=3 WHERE id=1013; -- 马可酒馆
UPDATE place SET pos_row=2, pos_col=4 WHERE id=1025; -- 农场(重复,改)
UPDATE place SET pos_row=2, pos_col=5 WHERE id=1028; -- 市场(重复,改)
UPDATE place SET pos_row=2, pos_col=6 WHERE id=1031; -- 铁匠铺(重复,改)

-- 第3行(中)：码头行
UPDATE place SET pos_row=3, pos_col=1 WHERE id=1022; -- ★码头(主码头东)
UPDATE place SET pos_row=3, pos_col=2 WHERE id=1011; -- 威尼斯码头
