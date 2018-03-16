# DATABASE pbi_pages

CREATE TABLE `users` (
  `uid` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(40) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `lastname` varchar(40) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `login` varchar(40) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `password` varchar(16) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `language` varchar(2) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(254) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=1000000 DEFAULT CHARSET=utf8;

CREATE TABLE `user_point` (
  `rel_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uid` int(10) unsigned NOT NULL,
  `pid` int(6) unsigned NOT NULL,
  `mode` enum('client','operator','admin','superuser') DEFAULT 'client',
  PRIMARY KEY (`rel_id`),
  KEY `appIdx` (`uid`, `pid`),
  CONSTRAINT `users_rel_1` FOREIGN KEY (`uid`) REFERENCES `users` (`uid`),
  CONSTRAINT `points_rel_1` FOREIGN KEY (`pid`) REFERENCES `points` (`pid`)
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8;

CREATE TABLE `points` (
  `pid` int(6) unsigned NOT NULL AUTO_INCREMENT,
  `app_point` varchar(16) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `app_title` varchar(16) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `report_id` varchar(48) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `group_id` varchar(48) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO users (name,lastname,login,password,language,email) values ('NAME', 'LASTNAME', 'login', 'pwd', 'ru', 'email@me.ru');
SET @SU_ID = SELECT LAST_INSERT_ID();

DELIMITER |
CREATE TRIGGER `grants_superuser` AFTER INSERT ON `points` FOR EACH ROW BEGIN
  INSERT INTO user_point (uid,pid,mode) VALUES (@SU_ID,NEW.pid, 'superuser');
END
