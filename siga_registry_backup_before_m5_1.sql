-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: localhost    Database: siga_registry
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `administrator_sessions`
--

DROP TABLE IF EXISTS `administrator_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `administrator_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `administrator_id` bigint unsigned NOT NULL,
  `token_hash` char(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `csrf_token_hash` char(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revoked_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_administrator_sessions_token` (`token_hash`),
  KEY `idx_administrator_sessions_active` (`token_hash`,`expires_at`,`revoked_at`),
  KEY `idx_administrator_sessions_administrator` (`administrator_id`),
  CONSTRAINT `fk_administrator_sessions_administrator` FOREIGN KEY (`administrator_id`) REFERENCES `administrators` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `administrator_sessions`
--

LOCK TABLES `administrator_sessions` WRITE;
/*!40000 ALTER TABLE `administrator_sessions` DISABLE KEYS */;
INSERT INTO `administrator_sessions` VALUES (1,1,'6739a35eb5d743fba42f55140b695ba035a375b55b6fc3e114d82df785a45172','5d120f3b0822cccbff45f14a054974b46168122f813600c6abed8bb505e56ce5','2026-10-22 20:02:43.108','2026-10-22 12:02:43.127','2026-10-22 12:21:42.907'),(2,1,'78ef9561b0102e13d61e3905ca43549e67e84307ad514e81218c2cd437871a0f','65aafb286a736166991530da76a5c40083549b328ae15b8848fb84c19946f515','2026-10-22 22:42:54.132','2026-10-22 14:42:54.140','2026-10-22 15:32:04.873'),(3,1,'f535a5b80b62fd487e172f81be461f8e08d1b6b843647ea3604a10769468111f','96d1f059f7633a9205a910384cb1b40015c67a393530dd1a4867fb1884258245','2026-10-23 00:00:54.385','2026-10-22 16:00:54.387',NULL),(4,1,'95aad551008c25a624890e3f040ad4f2ba7b9e6b60fd675d5045ac86e6b572b5','57875597c5afe5de6ba3cb9fbc77b396ffde340f684fc6fb07b2fcd43888461a','2026-10-23 17:56:35.885','2026-10-23 09:56:35.889','2026-10-23 10:19:12.501'),(5,1,'b093ae1c88e06ebaaefde8fe5eefe0bfcfd6d2531a99c457010717fdf31f816f','81dee79cf67723a576465763d428eadc008a86cc4ce1d2a4f4432e429e26ab3d','2026-10-23 18:47:35.667','2026-10-23 10:47:35.672','2026-10-23 10:47:44.136'),(6,1,'21d418e1ad4774041f0794f01090a4a0a8c11b8f840b8bb7b6c293ce0b6a358e','5dc951b7965e24ffa0765c2e7f00daedda85f0bc913149f15cc1ebf3d15a6526','2026-10-23 18:51:40.237','2026-10-23 10:51:40.241',NULL),(7,1,'da65918359d22aa0b21f6a3b097080da1c03da141b6b81506291fbad34fe9579','f3b434c2b60b0e644c599f1bb7d4c8eda78e53d45cc4488bbeb8518145f9a79e','2026-10-26 16:48:31.751','2026-10-26 08:48:31.760','2026-10-26 09:31:19.946'),(8,1,'7ceed0a1bd2da0a37f37d117a979431db4608cf79c0a84df1c6f804b1ff777d3','75f7403ae988244f209bbc52558f35ff5290f4502f66be6960d58baeaf65fecb','2026-10-26 17:57:16.676','2026-10-26 09:57:16.683',NULL);
/*!40000 ALTER TABLE `administrator_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `administrators`
--

DROP TABLE IF EXISTS `administrators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `administrators` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(254) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `last_login_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_administrators_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `administrators`
--

LOCK TABLES `administrators` WRITE;
/*!40000 ALTER TABLE `administrators` DISABLE KEYS */;
INSERT INTO `administrators` VALUES (1,'allniidarkwell@gmail.com','scrypt$16384$8$1$w9BXNl6G3NZ939vMgo7JJw$FuriO8YSCtmWMVe5DfZ5bzD5Ik2wqUzb3ESq4Q1nGVuO4A35LQn3xOSJ0o_gFh36x8yq7UDdbCvD_W-R7GIgDQ','2026-10-22 10:25:55.429','2026-10-26 09:57:16.684','2026-10-26 09:57:16.684');
/*!40000 ALTER TABLE `administrators` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(3) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'SOE','SOE','State-Owned Enterprise','2026-10-21 12:17:24.928','2026-10-21 12:17:24.928'),(2,'JVC','JVC','Joint Venture Company','2026-10-21 12:17:24.928','2026-10-21 12:17:24.928'),(3,'OSE','OSE','Other State Entity','2026-10-21 12:17:24.928','2026-10-21 12:17:24.928');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `establishments`
--

DROP TABLE IF EXISTS `establishments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `establishments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `website_url` varchar(2048) DEFAULT NULL,
  `category_id` tinyint unsigned NOT NULL,
  `email` varchar(254) DEFAULT NULL,
  `contact_number` varchar(32) DEFAULT NULL,
  `summary` varchar(500) NOT NULL,
  `slug` varchar(160) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `workflow_status` enum('draft','pending_review','published','changes_requested','rejected') NOT NULL DEFAULT 'draft',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `submitted_at` datetime(3) DEFAULT NULL,
  `reviewed_at` datetime(3) DEFAULT NULL,
  `review_feedback` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_establishments_name` (`name`),
  UNIQUE KEY `uq_establishments_slug` (`slug`),
  KEY `idx_establishments_category_status` (`category_id`,`workflow_status`),
  KEY `idx_establishments_public_directory` (`workflow_status`,`name`),
  CONSTRAINT `fk_establishments_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_establishments_name_length` CHECK ((char_length(trim(`name`)) between 3 and 120)),
  CONSTRAINT `chk_establishments_summary_length` CHECK ((char_length(trim(`summary`)) between 20 and 500))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `establishments`
--

LOCK TABLES `establishments` WRITE;
/*!40000 ALTER TABLE `establishments` DISABLE KEYS */;
INSERT INTO `establishments` VALUES (1,'Ghana Cocoa Board','https://cocobod.gh/',1,'public_affairs@cocobod.gh','0302661877','The Ghana Cocoa Board was established by ordinance in 1947 with the sum of ¢ 27 million as its initial working capital. The Board traces its beginning further back to the cocoa hold-up of 1937. The building of Cocoa House was not only meant to avoid payment of rent but also to represent a concrete expression of the Board’s faith in the future of the cocoa industry and a living monument to the hard work of the Ghanaian farmer.','ghana-cocoa-board','published','2026-10-23 10:18:46.079','2026-10-23 10:19:00.923',NULL,NULL,NULL);
/*!40000 ALTER TABLE `establishments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'siga_registry'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-26 14:22:49
