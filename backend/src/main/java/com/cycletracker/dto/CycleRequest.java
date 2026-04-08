package com.cycletracker.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CycleRequest {

    @NotNull(message = "Last period date is required")
    private LocalDate lastPeriodDate;

    @Builder.Default
    private int cycleLength = 28;

    @Builder.Default
    private int periodLength = 5;
}
