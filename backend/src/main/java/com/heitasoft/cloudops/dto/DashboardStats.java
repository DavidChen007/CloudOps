
package com.heitasoft.cloudops.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardStats {
    private String activePipelines;
    private String healthyPods;
    private String avgBuildTime;
    private String successRate;
}
