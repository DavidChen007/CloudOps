
package com.heitasoft.cloudops.controller;

import com.heitasoft.cloudops.entity.PipelineConfig;
import com.heitasoft.cloudops.repository.PipelineConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pipeline")
public class PipelineController {

    @Autowired
    private PipelineConfigRepository repository;

    @GetMapping("/configs")
    public List<PipelineConfig> getAllConfigs() {
        return repository.findAll();
    }

    @PostMapping("/save")
    public PipelineConfig saveConfig(@RequestBody PipelineConfig config) {
        return repository.save(config);
    }

    @GetMapping("/config/{id}")
    public ResponseEntity<PipelineConfig> getConfig(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
