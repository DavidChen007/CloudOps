
package com.heitasoft.cloudops.controller;

import com.heitasoft.cloudops.dto.DashboardStats;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @GetMapping("/stats")
    public DashboardStats getStats() {
        // In a real app, this would aggregate data from repositories
        return DashboardStats.builder()
                .activePipelines("24")
                .healthyPods("142")
                .avgBuildTime("4m 12s")
                .successRate("94.2%")
                .build();
    }
}
