-- Piping inspection schema for MySQL 8.
-- life_status and the summary columns on info are additions:
-- a nullable remaining_life cannot tell "blank" from "unlimited".

CREATE TABLE info (
  line_number VARCHAR(64) NOT NULL,
  location VARCHAR(255) NOT NULL,
  `from` VARCHAR(255) NOT NULL,
  `to` VARCHAR(255) NOT NULL,
  drawing_number VARCHAR(255) NOT NULL,
  service VARCHAR(255) NOT NULL,
  material VARCHAR(255) NOT NULL,
  inservice_date DATE NULL,
  pipe_size DECIMAL(6, 3) NOT NULL,
  original_thickness DECIMAL(8, 3) NULL,
  stress DECIMAL(12, 3) NOT NULL,
  joint_efficiency DECIMAL(5, 3) NOT NULL,
  ca DECIMAL(8, 3) NOT NULL,
  design_life INT NOT NULL,
  design_pressure DECIMAL(10, 3) NOT NULL,
  operating_pressure DECIMAL(10, 3) NOT NULL,
  design_temperature DECIMAL(8, 3) NOT NULL,
  operating_temperature DECIMAL(8, 3) NOT NULL,
  corrosion_rate DECIMAL(10, 4) NULL,
  remaining_life DECIMAL(10, 2) NULL,
  life_status ENUM('empty', 'unlimited', 'finite') NOT NULL DEFAULT 'empty',
  PRIMARY KEY (line_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cml (
  line_number VARCHAR(64) NOT NULL,
  cml_number INT NOT NULL,
  cml_description VARCHAR(255) NOT NULL,
  actual_outside_diameter DECIMAL(8, 3) NULL,
  design_thickness DECIMAL(8, 3) NULL,
  structural_thickness DECIMAL(8, 3) NULL,
  required_thickness DECIMAL(8, 3) NULL,
  corrosion_rate DECIMAL(10, 4) NULL,
  remaining_life DECIMAL(10, 2) NULL,
  life_status ENUM('empty', 'unlimited', 'finite') NOT NULL DEFAULT 'empty',
  PRIMARY KEY (line_number, cml_number),
  CONSTRAINT fk_cml_info
    FOREIGN KEY (line_number) REFERENCES info (line_number)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE test_point (
  line_number VARCHAR(64) NOT NULL,
  cml_number INT NOT NULL,
  tp_number INT NOT NULL,
  tp_description INT NOT NULL,
  note VARCHAR(500) NULL,
  corrosion_rate DECIMAL(10, 4) NULL,
  remaining_life DECIMAL(10, 2) NULL,
  life_status ENUM('empty', 'unlimited', 'finite') NOT NULL DEFAULT 'empty',
  PRIMARY KEY (line_number, cml_number, tp_number),
  CONSTRAINT fk_test_point_cml
    FOREIGN KEY (line_number, cml_number) REFERENCES cml (line_number, cml_number)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE thickness (
  line_number VARCHAR(64) NOT NULL,
  cml_number INT NOT NULL,
  tp_number INT NOT NULL,
  inspection_date DATE NOT NULL,
  actual_thickness DECIMAL(8, 3) NOT NULL,
  interval_corrosion_rate DECIMAL(10, 4) NULL,
  PRIMARY KEY (line_number, cml_number, tp_number, inspection_date),
  CONSTRAINT fk_thickness_test_point
    FOREIGN KEY (line_number, cml_number, tp_number)
    REFERENCES test_point (line_number, cml_number, tp_number)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
