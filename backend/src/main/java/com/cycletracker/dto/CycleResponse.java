package com.cycletracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CycleResponse {
    private LocalDate lastPeriodDate;
    private LocalDate nextPeriod;
    private LocalDate ovulation;
    private LocalDate fertileStart;
    private LocalDate fertileEnd;
    private String currentPhase;
    private int phaseDay;
    private int cycleLength;
    private int periodLength;
    private String phaseSuggestion;
    private String moodExpectation;
    private String energyLevel;
    private String careTip;
}
