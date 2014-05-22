-- phpMyAdmin SQL Dump
-- version 3.5.2.2
-- http://www.phpmyadmin.net
--
-- Host: 127.0.0.1
-- Generato il: Apr 25, 2014 alle 09:57
-- Versione del server: 5.5.27
-- Versione PHP: 5.5.0

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `smartrisk`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `assessment`
--

CREATE TABLE IF NOT EXISTS `assessment` (
  `Nome` varchar(128) NOT NULL,
  `UserId` int(11) NOT NULL,
  `Organizzazione` varchar(128) DEFAULT NULL,
  `RespSicurezza` varchar(128) DEFAULT NULL,
  `Descrizione` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`Nome`,`UserId`),
  KEY `fk_UserId` (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `asset`
--

CREATE TABLE IF NOT EXISTS `asset` (
  `IdAsset` int(11) NOT NULL AUTO_INCREMENT,
  `NomeAssessment` varchar(128) NOT NULL,
  `UserId` int(11) NOT NULL,
  `Resource` varchar(128) NOT NULL,
  `ExtendedInfo` varchar(128) DEFAULT NULL,
  `Timestamp` timestamp NULL DEFAULT NULL,
  `IdLocation` int(11) DEFAULT NULL,
  `AssetType` varchar(64) NOT NULL,
  PRIMARY KEY (`IdAsset`,`NomeAssessment`,`UserId`),
  KEY `fk_NomeAssessment_UserId` (`NomeAssessment`,`UserId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=137 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `circuit`
--

CREATE TABLE IF NOT EXISTS `circuit` (
  `IdCircuit` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  `CircuitName` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`IdCircuit`,`IdAsset`),
  KEY `fk_circuit` (`IdAsset`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=4 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `computing-device`
--

CREATE TABLE IF NOT EXISTS `computing-device` (
  `IdComputingDevice` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  `DistinguishedName` varchar(128) DEFAULT NULL,
  `Fdqn` varchar(128) DEFAULT NULL,
  `Hostname` varchar(128) DEFAULT NULL,
  `MotherboardGuid` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`IdComputingDevice`,`IdAsset`),
  KEY `fk_computing-device` (`IdAsset`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=45 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `computing-device-connected-to`
--

CREATE TABLE IF NOT EXISTS `computing-device-connected-to` (
  `IdComputingDevice` int(11) NOT NULL,
  `IdSystem` int(11) NOT NULL,
  PRIMARY KEY (`IdComputingDevice`,`IdSystem`),
  KEY `fk_computing-device-connected-to-2` (`IdSystem`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `connected-to-network`
--

CREATE TABLE IF NOT EXISTS `connected-to-network` (
  `IdSystem` int(11) NOT NULL,
  `IdNetwork` int(11) NOT NULL,
  PRIMARY KEY (`IdSystem`,`IdNetwork`),
  KEY `fk_connected-to-network-2` (`IdNetwork`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `connection`
--

CREATE TABLE IF NOT EXISTS `connection` (
  `IdConnection` int(11) NOT NULL AUTO_INCREMENT,
  `IdComputingDevice` int(11) NOT NULL,
  `IpAddress` varchar(15) DEFAULT NULL,
  `MacAddress` varchar(17) DEFAULT NULL,
  `Url` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`IdConnection`,`IdComputingDevice`),
  KEY `fk_connection` (`IdComputingDevice`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=35 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `data`
--

CREATE TABLE IF NOT EXISTS `data` (
  `IdData` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  PRIMARY KEY (`IdData`,`IdAsset`),
  KEY `fk_data` (`IdAsset`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `database`
--

CREATE TABLE IF NOT EXISTS `database` (
  `IdDatabase` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  `InstanceName` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`IdDatabase`,`IdAsset`),
  KEY `fk_database` (`IdAsset`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `database-served-by`
--

CREATE TABLE IF NOT EXISTS `database-served-by` (
  `IdDatabase` int(11) NOT NULL,
  `IdService` int(11) NOT NULL,
  PRIMARY KEY (`IdDatabase`,`IdService`),
  KEY `fk_database-served-by-2` (`IdService`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `has-network-termination-point`
--

CREATE TABLE IF NOT EXISTS `has-network-termination-point` (
  `IdCircuit` int(11) NOT NULL,
  `IdNetwork` int(11) NOT NULL,
  PRIMARY KEY (`IdCircuit`,`IdNetwork`),
  KEY `fk_has-network-termination-point-2` (`IdNetwork`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `has-service-provider`
--

CREATE TABLE IF NOT EXISTS `has-service-provider` (
  `IdCircuit` int(11) NOT NULL,
  `IdOrganization` int(11) NOT NULL,
  PRIMARY KEY (`IdCircuit`,`IdOrganization`),
  KEY `fk_has-service-provider-2` (`IdOrganization`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `has-termination-device`
--

CREATE TABLE IF NOT EXISTS `has-termination-device` (
  `IdCircuit` int(11) NOT NULL,
  `IdComputingDevice` int(11) NOT NULL,
  PRIMARY KEY (`IdCircuit`,`IdComputingDevice`),
  KEY `fk_has-termination-device-2` (`IdComputingDevice`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `identified-by-cpe`
--

CREATE TABLE IF NOT EXISTS `identified-by-cpe` (
  `IdComputingDevice` int(11) NOT NULL,
  `CpeName` varchar(128) NOT NULL,
  PRIMARY KEY (`IdComputingDevice`,`CpeName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `installed-on-device`
--

CREATE TABLE IF NOT EXISTS `installed-on-device` (
  `IdSoftware` int(11) NOT NULL,
  `IdComputingDevice` int(11) NOT NULL,
  PRIMARY KEY (`IdSoftware`,`IdComputingDevice`),
  KEY `fk_installed-on-device-2` (`IdComputingDevice`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `is-administrator-of-computing-device`
--

CREATE TABLE IF NOT EXISTS `is-administrator-of-computing-device` (
  `IdPerson` int(11) NOT NULL,
  `IdComputingDevice` int(11) NOT NULL,
  PRIMARY KEY (`IdPerson`,`IdComputingDevice`),
  KEY `fk_is-administrator-of-computing-device-2` (`IdComputingDevice`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `is-administrator-of-system`
--

CREATE TABLE IF NOT EXISTS `is-administrator-of-system` (
  `IdPerson` int(11) NOT NULL,
  `IdSystem` int(11) NOT NULL,
  PRIMARY KEY (`IdPerson`,`IdSystem`),
  KEY `fk_is-administrator-of-system-2` (`IdSystem`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `location`
--

CREATE TABLE IF NOT EXISTS `location` (
  `IdLocation` int(11) NOT NULL AUTO_INCREMENT,
  `Longitude` int(4) DEFAULT NULL,
  `Latitude` int(4) DEFAULT NULL,
  `Elevation` int(10) DEFAULT NULL,
  `Radius` int(10) DEFAULT NULL,
  `RegionName` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`IdLocation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `network`
--

CREATE TABLE IF NOT EXISTS `network` (
  `IdNetwork` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  `NetworkName` varchar(128) DEFAULT NULL,
  `IpNetStart` varchar(15) DEFAULT NULL,
  `IpNetEnd` varchar(15) DEFAULT NULL,
  `Cidr` varchar(19) DEFAULT NULL,
  PRIMARY KEY (`IdNetwork`,`IdAsset`),
  KEY `fk_network` (`IdAsset`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=10 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `organization`
--

CREATE TABLE IF NOT EXISTS `organization` (
  `IdOrganization` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  `Name` varchar(128) DEFAULT NULL,
  `Email` varchar(128) DEFAULT NULL,
  `PhoneNumber` varchar(15) DEFAULT NULL,
  `WebsiteUrl` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`IdOrganization`,`IdAsset`),
  KEY `fk_organization` (`IdAsset`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=9 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `organization-is-owner-of`
--

CREATE TABLE IF NOT EXISTS `organization-is-owner-of` (
  `IdOrganization` int(11) NOT NULL,
  `IdAsset` int(11) NOT NULL,
  PRIMARY KEY (`IdOrganization`,`IdAsset`),
  KEY `fk_organization-is-owner-of-2` (`IdAsset`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `part-of`
--

CREATE TABLE IF NOT EXISTS `part-of` (
  `IdPerson` int(11) NOT NULL,
  `IdOrganization` int(11) NOT NULL,
  PRIMARY KEY (`IdPerson`,`IdOrganization`),
  KEY `fk_part-of-2` (`IdOrganization`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `person`
--

CREATE TABLE IF NOT EXISTS `person` (
  `IdPerson` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  `Name` varchar(128) DEFAULT NULL,
  `Email` varchar(128) DEFAULT NULL,
  `PhoneNumber` int(20) DEFAULT NULL,
  `Birthdate` date DEFAULT NULL,
  PRIMARY KEY (`IdPerson`,`IdAsset`),
  KEY `fk_person` (`IdAsset`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=10 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `person-is-owner-of`
--

CREATE TABLE IF NOT EXISTS `person-is-owner-of` (
  `IdPerson` int(11) NOT NULL,
  `IdAsset` int(11) NOT NULL,
  PRIMARY KEY (`IdPerson`,`IdAsset`),
  KEY `fk_person-is-owner-of-2` (`IdAsset`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `port-service`
--

CREATE TABLE IF NOT EXISTS `port-service` (
  `IdPort` int(11) NOT NULL AUTO_INCREMENT,
  `IdService` int(11) NOT NULL,
  `Port` int(5) DEFAULT NULL,
  `LowerBound` int(5) DEFAULT NULL,
  `UpperBound` int(5) DEFAULT NULL,
  PRIMARY KEY (`IdPort`,`IdService`),
  KEY `fk_port-service` (`IdService`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `service`
--

CREATE TABLE IF NOT EXISTS `service` (
  `IdService` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  `Ip` varchar(15) DEFAULT NULL,
  `Fdqn` varchar(128) DEFAULT NULL,
  `Protocol` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`IdService`,`IdAsset`),
  KEY `fk_service` (`IdAsset`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `service-has-service-provider`
--

CREATE TABLE IF NOT EXISTS `service-has-service-provider` (
  `IdService` int(11) NOT NULL,
  `IdSoftware` int(11) NOT NULL,
  PRIMARY KEY (`IdService`,`IdSoftware`),
  KEY `fk_service-has-service-provider-2` (`IdSoftware`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `software`
--

CREATE TABLE IF NOT EXISTS `software` (
  `IdSoftware` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  `InstallationId` varchar(128) DEFAULT NULL,
  `Cpe` varchar(128) DEFAULT NULL,
  `License` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`IdSoftware`,`IdAsset`),
  KEY `fk_software` (`IdAsset`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `system`
--

CREATE TABLE IF NOT EXISTS `system` (
  `IdSystem` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  `SystemName` varchar(128) DEFAULT NULL,
  `Version` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`IdSystem`,`IdAsset`),
  KEY `fk_system` (`IdAsset`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=11 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `system-connected-to`
--

CREATE TABLE IF NOT EXISTS `system-connected-to` (
  `IdSystem1` int(11) NOT NULL,
  `IdSystem2` int(11) NOT NULL,
  PRIMARY KEY (`IdSystem1`,`IdSystem2`),
  KEY `fk_system-connected-to-2` (`IdSystem2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Struttura della tabella `utenti`
--

CREATE TABLE IF NOT EXISTS `utenti` (
  `UserId` int(11) NOT NULL AUTO_INCREMENT,
  `Username` varchar(16) NOT NULL,
  `Salt` varchar(1024) NOT NULL,
  `Pwd` varchar(2048) NOT NULL,
  `MaxPrivilege` tinyint(1) NOT NULL,
  PRIMARY KEY (`UserId`),
  UNIQUE KEY `Username` (`Username`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=5 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `website`
--

CREATE TABLE IF NOT EXISTS `website` (
  `IdWebsite` int(11) NOT NULL AUTO_INCREMENT,
  `IdAsset` int(11) NOT NULL,
  `DocumentRoot` varchar(128) DEFAULT NULL,
  `Locale` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`IdWebsite`,`IdAsset`),
  KEY `fk_website` (`IdAsset`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Struttura della tabella `website-served-by`
--

CREATE TABLE IF NOT EXISTS `website-served-by` (
  `IdWebsite` int(11) NOT NULL,
  `IdService` int(11) NOT NULL,
  PRIMARY KEY (`IdWebsite`,`IdService`),
  KEY `fk_website-served-by-2` (`IdService`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `assessment`
--
ALTER TABLE `assessment`
  ADD CONSTRAINT `fk_UserId` FOREIGN KEY (`UserId`) REFERENCES `utenti` (`UserId`) ON DELETE CASCADE;

--
-- Limiti per la tabella `asset`
--
ALTER TABLE `asset`
  ADD CONSTRAINT `fk_NomeAssessment_UserId` FOREIGN KEY (`NomeAssessment`, `UserId`) REFERENCES `assessment` (`Nome`, `UserId`) ON DELETE CASCADE;

--
-- Limiti per la tabella `circuit`
--
ALTER TABLE `circuit`
  ADD CONSTRAINT `fk_circuit` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `computing-device`
--
ALTER TABLE `computing-device`
  ADD CONSTRAINT `fk_computing-device` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `computing-device-connected-to`
--
ALTER TABLE `computing-device-connected-to`
  ADD CONSTRAINT `fk_computing-device-connected-to-1` FOREIGN KEY (`IdComputingDevice`) REFERENCES `computing-device` (`IdComputingDevice`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_computing-device-connected-to-2` FOREIGN KEY (`IdSystem`) REFERENCES `system` (`IdSystem`) ON DELETE CASCADE;

--
-- Limiti per la tabella `connected-to-network`
--
ALTER TABLE `connected-to-network`
  ADD CONSTRAINT `fk_connected-to-network-1` FOREIGN KEY (`IdSystem`) REFERENCES `system` (`IdSystem`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_connected-to-network-2` FOREIGN KEY (`IdNetwork`) REFERENCES `network` (`IdNetwork`) ON DELETE CASCADE;

--
-- Limiti per la tabella `connection`
--
ALTER TABLE `connection`
  ADD CONSTRAINT `fk_connection` FOREIGN KEY (`IdComputingDevice`) REFERENCES `computing-device` (`IdComputingDevice`) ON DELETE CASCADE;

--
-- Limiti per la tabella `data`
--
ALTER TABLE `data`
  ADD CONSTRAINT `fk_data` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `database`
--
ALTER TABLE `database`
  ADD CONSTRAINT `fk_database` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `database-served-by`
--
ALTER TABLE `database-served-by`
  ADD CONSTRAINT `fk_database-served-by-1` FOREIGN KEY (`IdDatabase`) REFERENCES `database` (`IdDatabase`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_database-served-by-2` FOREIGN KEY (`IdService`) REFERENCES `service` (`IdService`) ON DELETE CASCADE;

--
-- Limiti per la tabella `has-network-termination-point`
--
ALTER TABLE `has-network-termination-point`
  ADD CONSTRAINT `fk_has-network-termination-point-1` FOREIGN KEY (`IdCircuit`) REFERENCES `circuit` (`IdCircuit`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_has-network-termination-point-2` FOREIGN KEY (`IdNetwork`) REFERENCES `network` (`IdNetwork`) ON DELETE CASCADE;

--
-- Limiti per la tabella `has-service-provider`
--
ALTER TABLE `has-service-provider`
  ADD CONSTRAINT `fk_has-service-provider-1` FOREIGN KEY (`IdCircuit`) REFERENCES `circuit` (`IdCircuit`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_has-service-provider-2` FOREIGN KEY (`IdOrganization`) REFERENCES `organization` (`IdOrganization`) ON DELETE CASCADE;

--
-- Limiti per la tabella `has-termination-device`
--
ALTER TABLE `has-termination-device`
  ADD CONSTRAINT `fk_has-termination-device-1` FOREIGN KEY (`IdCircuit`) REFERENCES `circuit` (`IdCircuit`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_has-termination-device-2` FOREIGN KEY (`IdComputingDevice`) REFERENCES `computing-device` (`IdComputingDevice`) ON DELETE CASCADE;

--
-- Limiti per la tabella `identified-by-cpe`
--
ALTER TABLE `identified-by-cpe`
  ADD CONSTRAINT `fk_identified-by-cpe` FOREIGN KEY (`IdComputingDevice`) REFERENCES `computing-device` (`IdComputingDevice`) ON DELETE CASCADE;

--
-- Limiti per la tabella `installed-on-device`
--
ALTER TABLE `installed-on-device`
  ADD CONSTRAINT `fk_installed-on-device-1` FOREIGN KEY (`IdSoftware`) REFERENCES `software` (`IdSoftware`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_installed-on-device-2` FOREIGN KEY (`IdComputingDevice`) REFERENCES `computing-device` (`IdComputingDevice`) ON DELETE CASCADE;

--
-- Limiti per la tabella `is-administrator-of-computing-device`
--
ALTER TABLE `is-administrator-of-computing-device`
  ADD CONSTRAINT `fk_is-administrator-of-computing-device-1` FOREIGN KEY (`IdPerson`) REFERENCES `person` (`IdPerson`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_is-administrator-of-computing-device-2` FOREIGN KEY (`IdComputingDevice`) REFERENCES `computing-device` (`IdComputingDevice`) ON DELETE CASCADE;

--
-- Limiti per la tabella `is-administrator-of-system`
--
ALTER TABLE `is-administrator-of-system`
  ADD CONSTRAINT `fk_is-administrator-of-system-1` FOREIGN KEY (`IdPerson`) REFERENCES `person` (`IdPerson`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_is-administrator-of-system-2` FOREIGN KEY (`IdSystem`) REFERENCES `system` (`IdSystem`) ON DELETE CASCADE;

--
-- Limiti per la tabella `network`
--
ALTER TABLE `network`
  ADD CONSTRAINT `fk_network` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `organization`
--
ALTER TABLE `organization`
  ADD CONSTRAINT `fk_organization` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `organization-is-owner-of`
--
ALTER TABLE `organization-is-owner-of`
  ADD CONSTRAINT `fk_organization-is-owner-of-1` FOREIGN KEY (`IdOrganization`) REFERENCES `organization` (`IdOrganization`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_organization-is-owner-of-2` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `part-of`
--
ALTER TABLE `part-of`
  ADD CONSTRAINT `fk_part-of-1` FOREIGN KEY (`IdPerson`) REFERENCES `person` (`IdPerson`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_part-of-2` FOREIGN KEY (`IdOrganization`) REFERENCES `organization` (`IdOrganization`) ON DELETE CASCADE;

--
-- Limiti per la tabella `person`
--
ALTER TABLE `person`
  ADD CONSTRAINT `fk_person` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `person-is-owner-of`
--
ALTER TABLE `person-is-owner-of`
  ADD CONSTRAINT `fk_person-is-owner-of-1` FOREIGN KEY (`IdPerson`) REFERENCES `person` (`IdPerson`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_person-is-owner-of-2` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `port-service`
--
ALTER TABLE `port-service`
  ADD CONSTRAINT `fk_port-service` FOREIGN KEY (`IdService`) REFERENCES `service` (`IdService`) ON DELETE CASCADE;

--
-- Limiti per la tabella `service`
--
ALTER TABLE `service`
  ADD CONSTRAINT `fk_service` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `service-has-service-provider`
--
ALTER TABLE `service-has-service-provider`
  ADD CONSTRAINT `fk_service-has-service-provider-1` FOREIGN KEY (`IdService`) REFERENCES `service` (`IdService`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_service-has-service-provider-2` FOREIGN KEY (`IdSoftware`) REFERENCES `software` (`IdSoftware`) ON DELETE CASCADE;

--
-- Limiti per la tabella `software`
--
ALTER TABLE `software`
  ADD CONSTRAINT `fk_software` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `system`
--
ALTER TABLE `system`
  ADD CONSTRAINT `fk_system` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `system-connected-to`
--
ALTER TABLE `system-connected-to`
  ADD CONSTRAINT `fk_system-connected-to-1` FOREIGN KEY (`IdSystem1`) REFERENCES `system` (`IdSystem`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_system-connected-to-2` FOREIGN KEY (`IdSystem2`) REFERENCES `system` (`IdSystem`) ON DELETE CASCADE;

--
-- Limiti per la tabella `website`
--
ALTER TABLE `website`
  ADD CONSTRAINT `fk_website` FOREIGN KEY (`IdAsset`) REFERENCES `asset` (`IdAsset`) ON DELETE CASCADE;

--
-- Limiti per la tabella `website-served-by`
--
ALTER TABLE `website-served-by`
  ADD CONSTRAINT `fk_website-served-by-1` FOREIGN KEY (`IdWebsite`) REFERENCES `website` (`IdWebsite`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_website-served-by-2` FOREIGN KEY (`IdService`) REFERENCES `service` (`IdService`) ON DELETE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
