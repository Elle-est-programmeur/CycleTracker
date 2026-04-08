package com.cycletracker.controller;

import com.cycletracker.dto.CycleRequest;
import com.cycletracker.dto.CycleResponse;
import com.cycletracker.entity.Cycle;
import com.cycletracker.entity.User;
import com.cycletracker.service.CycleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cycle")
@RequiredArgsConstructor
public class CycleController {

    private final CycleService cycleService;

    @PostMapping("/predict")
    public ResponseEntity<CycleResponse> predict(
            @Valid @RequestBody CycleRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cycleService.predict(req));
    }

    @PostMapping("/save")
    public ResponseEntity<Cycle> save(
            @Valid @RequestBody CycleRequest req,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cycleService.save(req, user.getId()));
    }

    @GetMapping("/all")
    public ResponseEntity<List<Cycle>> getAll(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(cycleService.getAllByUser(user.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {
        cycleService.delete(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
