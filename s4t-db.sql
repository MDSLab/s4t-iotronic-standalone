-- MyArduino 4 Cloud Database v.1.0

-- board_types
DROP TABLE IF EXISTS `board_types`;
CREATE TABLE IF NOT EXISTS `board_types` (
   `id` int(8) NOT NULL auto_increment,
   `sku` varchar(15) NOT NULL,
   `image` varchar(250),
   `electric_schema` varchar(250),
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- boards
DROP TABLE IF EXISTS `boards`;
CREATE TABLE IF NOT EXISTS `boards` (
  `id` int(8) NOT NULL AUTO_INCREMENT,
  `type_id` int(8) NOT NULL,
  `name` varchar(200),
  `description` text,
  `language` varchar(5),
  `store_url` varchar(200),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`type_id`) REFERENCES `board_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- user_groups
DROP TABLE IF EXISTS `user_groups`;
CREATE TABLE IF NOT EXISTS `user_groups` (
   `id` int(8) NOT NULL AUTO_INCREMENT,
   `name` varchar(50),
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- users
DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
   `id` int(8) NOT NULL AUTO_INCREMENT,
   `username` varchar(50),
   `password` varchar(25),
   `group_id` int(8) NOT NULL,
   `email` varchar(100) NOT NULL,
   `active` tinyint(1) DEFAULT 0,
   PRIMARY KEY (`id`),
   FOREIGN KEY (`group_id`) REFERENCES `user_groups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- user_profiles
DROP TABLE IF EXISTS `user_profiles`;
CREATE TABLE IF NOT EXISTS `user_profiles` (
   `id` int(8) NOT NULL AUTO_INCREMENT,
   `user_id` int(8) NOT NULL,
   `name` varchar(50),
   `surname` varchar(50),
   `avatar` varchar(200),
   PRIMARY KEY (`id`),
   FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- board_imports
DROP TABLE IF EXISTS `board_imports`;
CREATE TABLE IF NOT EXISTS `board_imports` (
   `id` int(8) NOT NULL AUTO_INCREMENT,
   `idate` timestamp DEFAULT CURRENT_TIMESTAMP,
   `user_id` int(8) NOT NULL,
   PRIMARY KEY (`id`),
   FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- board_codes
DROP TABLE IF EXISTS `board_codes`;
CREATE TABLE IF NOT EXISTS `board_codes` (
   `code` varchar(25) NOT NULL,
   `creation_date` timestamp DEFAULT CURRENT_TIMESTAMP,
   UNIQUE KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- user_boards
DROP TABLE IF EXISTS `user_boards`;
CREATE TABLE IF NOT EXISTS `user_boards` (
   `id` int(8) NOT NULL AUTO_INCREMENT,
   `user_id` int(8) NOT NULL,
   `board_type` int(8) NOT NULL,
   `board_code` varchar(25) NOT NULL, 
   `cloud_enabled` tinyint(1) DEFAULT 0,
   PRIMARY KEY (`id`),
   FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
   FOREIGN KEY (`board_type`) REFERENCES `board_types` (`id`),
   FOREIGN KEY (`board_code`) REFERENCES `board_codes` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- boards_connected
DROP TABLE IF EXISTS `boards_connected`;
CREATE TABLE IF NOT EXISTS `boards_connected` (
   `board_code` varchar(25) NOT NULL,
   `session_id` varchar(250),
   `status` varchar(15),
   PRIMARY KEY (`board_code`)
) ENGINE=MEMORY DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- reverse_cloud_services
DROP TABLE IF EXISTS `reverse_cloud_services`;
CREATE TABLE IF NOT EXISTS `reverse_cloud_services` (
   `board_id` int(8) NOT NULL,
   `service` varchar(50) NOT NULL,
   `public_ip` varchar(16) NOT NULL,
   `public_port` varchar(5) NOT NULL,
   CONSTRAINT PRIMARY KEY (`board_id`,`service`)
) ENGINE=MEMORY DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- userprojects
DROP TABLE IF EXISTS `userprojects`;
CREATE TABLE IF NOT EXISTS `userprojects` (
   `id` int(8) NOT NULL AUTO_INCREMENT,
   `user_id` int(8) NOT NULL,
   `title` varchar(100) NOT NULL,
   `description` text,
   `creation_date` timestamp DEFAULT CURRENT_TIMESTAMP,
   `status` varchar(15) DEFAULT 'private',
   PRIMARY KEY (`id`),
   FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- userproject_comments
DROP TABLE IF EXISTS `userproject_comments`;
CREATE TABLE IF NOT EXISTS `userproject_comments` (
   `id` int(8) NOT NULL AUTO_INCREMENT,
   `project_id` int(8) NOT NULL,
   `user_id` int(8) NOT NULL,
   `content` text NOT NULL,
   `creation_date` timestamp DEFAULT CURRENT_TIMESTAMP,
   `status` varchar(15) DEFAULT 'public',
   PRIMARY KEY (`id`),
   FOREIGN KEY (`project_id`) REFERENCES `userprojects` (`id`),
   FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

-- userproject_likes
DROP TABLE IF EXISTS `userproject_likes`;
CREATE TABLE IF NOT EXISTS `userproject_likes` (
   `project_id` int(8) NOT NULL,
   `user_id` int(8) NOT NULL,
   FOREIGN KEY (`project_id`) REFERENCES `userprojects` (`id`),
   FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;