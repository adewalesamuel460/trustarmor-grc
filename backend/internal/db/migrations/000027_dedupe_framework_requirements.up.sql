-- Migration 000027: Deduplicate framework_requirements and add UNIQUE constraint

DO $$
DECLARE
    dup RECORD;
    master_req_id UUID;
BEGIN
    FOR dup IN 
        SELECT framework_id, identifier, array_agg(id ORDER BY created_at ASC, id ASC) as ids
        FROM framework_requirements
        GROUP BY framework_id, identifier
        HAVING COUNT(*) > 1
    LOOP
        master_req_id := dup.ids[1];
        
        -- Remap control_mappings references to master_req_id
        UPDATE control_mappings
        SET requirement_id = master_req_id
        WHERE requirement_id = ANY(dup.ids[2:])
        AND NOT EXISTS (
            SELECT 1 FROM control_mappings cm2 
            WHERE cm2.control_id = control_mappings.control_id 
            AND cm2.requirement_id = master_req_id
        );
        DELETE FROM control_mappings WHERE requirement_id = ANY(dup.ids[2:]);

        -- Delete duplicate framework_requirements
        DELETE FROM framework_requirements WHERE id = ANY(dup.ids[2:]);
    END LOOP;
END $$;

-- Add UNIQUE constraint on (framework_id, identifier) to prevent future duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'framework_requirements_framework_identifier_key'
    ) THEN
        ALTER TABLE framework_requirements ADD CONSTRAINT framework_requirements_framework_identifier_key UNIQUE (framework_id, identifier);
    END IF;
END $$;
