package com.cycletracker.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cycles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cycle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;

    private LocalDate lastPeriodDate;

    @Builder.Default
    private int cycleLength = 28;

    @Builder.Default
    private int periodLength = 5;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
