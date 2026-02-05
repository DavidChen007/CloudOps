
package com.heitasoft.cloudops.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "jenkins_jobs")
public class JenkinsJob {

    @Id
    private String id; // Using string ID to match frontend mock format (e.g. 'j1')

    @Column(nullable = false)
    private String name;

    private String status; // SUCCESS, FAILURE, IN_PROGRESS, ABORTED
    private String lastDuration;
    private String lastBuild;
    private String branch;

    private LocalDateTime lastTime;

    // Foreign key to PipelineConfig (Optional, as some jobs might be pre-existing)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_config_id")
    private PipelineConfig pipelineConfig;
}
