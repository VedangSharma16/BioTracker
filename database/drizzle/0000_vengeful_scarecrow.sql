CREATE TABLE `alert` (
	`alert_id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`alert_type` varchar(50) NOT NULL,
	`alert_message` text NOT NULL,
	`alert_date` timestamp NOT NULL DEFAULT (now()),
	`status` text NOT NULL DEFAULT ('pending'),
	CONSTRAINT `alert_alert_id` PRIMARY KEY(`alert_id`)
);
--> statement-breakpoint
CREATE TABLE `doctor` (
	`doctor_id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`specialization` varchar(50) NOT NULL,
	`contact` varchar(15),
	CONSTRAINT `doctor_doctor_id` PRIMARY KEY(`doctor_id`)
);
--> statement-breakpoint
CREATE TABLE `health_record` (
	`record_id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`record_date` timestamp NOT NULL DEFAULT (now()),
	`blood_sugar` decimal(5,2),
	`bp_systolic` int,
	`bp_diastolic` int,
	`notes` text,
	CONSTRAINT `health_record_record_id` PRIMARY KEY(`record_id`)
);
--> statement-breakpoint
CREATE TABLE `medicine` (
	`medicine_id` int AUTO_INCREMENT NOT NULL,
	`prescription_id` int NOT NULL,
	`medicine_name` varchar(100) NOT NULL,
	`dosage` varchar(50) NOT NULL,
	`frequency` varchar(50) NOT NULL,
	`refill_interval_days` int,
	CONSTRAINT `medicine_medicine_id` PRIMARY KEY(`medicine_id`)
);
--> statement-breakpoint
CREATE TABLE `patient` (
	`patient_id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`age` int NOT NULL,
	`gender` varchar(10) NOT NULL,
	`phone` varchar(15),
	`emergency_contact` varchar(15),
	CONSTRAINT `patient_patient_id` PRIMARY KEY(`patient_id`)
);
--> statement-breakpoint
CREATE TABLE `prescription` (
	`prescription_id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`doctor_id` int NOT NULL,
	`prescription_date` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prescription_prescription_id` PRIMARY KEY(`prescription_id`)
);
--> statement-breakpoint
CREATE TABLE `refill` (
	`refill_id` int AUTO_INCREMENT NOT NULL,
	`medicine_id` int NOT NULL,
	`refill_date` timestamp NOT NULL,
	`next_refill_date` timestamp,
	`cost` decimal(10,2) NOT NULL,
	CONSTRAINT `refill_refill_id` PRIMARY KEY(`refill_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`password` varchar(50) NOT NULL,
	`role` text NOT NULL,
	`patient_id` int,
	CONSTRAINT `users_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `alert` ADD CONSTRAINT `alert_patient_id_patient_patient_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patient`(`patient_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `health_record` ADD CONSTRAINT `health_record_patient_id_patient_patient_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patient`(`patient_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medicine` ADD CONSTRAINT `medicine_prescription_id_prescription_prescription_id_fk` FOREIGN KEY (`prescription_id`) REFERENCES `prescription`(`prescription_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescription` ADD CONSTRAINT `prescription_patient_id_patient_patient_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patient`(`patient_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescription` ADD CONSTRAINT `prescription_doctor_id_doctor_doctor_id_fk` FOREIGN KEY (`doctor_id`) REFERENCES `doctor`(`doctor_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refill` ADD CONSTRAINT `refill_medicine_id_medicine_medicine_id_fk` FOREIGN KEY (`medicine_id`) REFERENCES `medicine`(`medicine_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_patient_id_patient_patient_id_fk` FOREIGN KEY (`patient_id`) REFERENCES `patient`(`patient_id`) ON DELETE no action ON UPDATE no action;