
package com.heitasoft.cloudops.repository;

import com.heitasoft.cloudops.entity.PipelineConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PipelineConfigRepository extends JpaRepository<PipelineConfig, Long> {
}
