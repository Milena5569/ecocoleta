USE ecocoleta;

CREATE TABLE IF NOT EXISTS coletas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    cliente VARCHAR(120) NOT NULL,
    tipo_residuo VARCHAR(20) NOT NULL,
    peso_kg DECIMAL(10, 2) NOT NULL,
    data_coleta DATE NOT NULL,
    status VARCHAR(12) NOT NULL,
    observacao TEXT NULL,

    PRIMARY KEY (id),

    CONSTRAINT chk_coletas_cliente_min
        CHECK (CHAR_LENGTH(TRIM(cliente)) >= 3),

    CONSTRAINT chk_coletas_tipo_residuo
        CHECK (
            tipo_residuo IN (
                'Papelão',
                'Plástico',
                'Metal',
                'Vidro',
                'Óleo',
                'Eletrônico'
            )
        ),

    CONSTRAINT chk_coletas_peso
        CHECK (peso_kg > 0),

    CONSTRAINT chk_coletas_status
        CHECK (status IN ('Agendada', 'Realizada', 'Cancelada'))
)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;