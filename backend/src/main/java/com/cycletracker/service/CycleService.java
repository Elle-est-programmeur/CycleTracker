package com.cycletracker.service;

import com.cycletracker.dto.CycleRequest;
import com.cycletracker.dto.CycleResponse;
import com.cycletracker.entity.Cycle;
import com.cycletracker.repository.CycleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CycleService {

    private final CycleRepository cycleRepository;

    public CycleResponse predict(CycleRequest req) {
        LocalDate lastPeriod = req.getLastPeriodDate();
        int cycleLen = req.getCycleLength() > 0 ? req.getCycleLength() : 28;
        int periodLen = req.getPeriodLength() > 0 ? req.getPeriodLength() : 5;

        LocalDate nextPeriod  = lastPeriod.plusDays(cycleLen);
        LocalDate ovulation   = nextPeriod.minusDays(14);
        LocalDate fertileStart = ovulation.minusDays(5);
        LocalDate fertileEnd   = ovulation.plusDays(1);

        // Current position in cycle (day 1 = lastPeriodDate)
        LocalDate today = LocalDate.now();
        long raw = ChronoUnit.DAYS.between(lastPeriod, today) + 1;
        int dayInCycle = (int) (((raw - 1) % cycleLen + cycleLen) % cycleLen) + 1;

        String phase, mood, energy, careTip, suggestion;

        if (dayInCycle <= periodLen) {
            phase      = "Menstrual";
            mood       = "Introspective, sensitive";
            energy     = "Low — rest mode";
            careTip    = "Warm compress, iron-rich foods, stay hydrated";
            suggestion = "She may feel low energy today — warmth and gentleness go a long way 💙";
        } else if (dayInCycle <= cycleLen / 2) {
            phase      = "Follicular";
            mood       = "Rising energy, motivated";
            energy     = "Building up steadily";
            careTip    = "Great time for light cardio and starting new projects";
            suggestion = "Energy is rising! A perfect time for new ideas and fresh plans 🌸";
        } else if (today.equals(ovulation) || (dayInCycle >= cycleLen - 15 && dayInCycle <= cycleLen - 13)) {
            phase      = "Ovulation";
            mood       = "Confident, social, peak energy";
            energy     = "High — peak performance";
            careTip    = "Best time for important decisions and high-intensity workouts";
            suggestion = "Peak confidence and radiant energy today — she's glowing ✨";
        } else {
            phase      = "Luteal";
            mood       = "Reflective, PMS possible";
            energy     = "Gradually declining";
            careTip    = "Magnesium-rich foods, gentle yoga, reduce caffeine";
            suggestion = "She might need extra patience and comfort right now 💜";
        }

        return CycleResponse.builder()
                .lastPeriodDate(lastPeriod)
                .nextPeriod(nextPeriod)
                .ovulation(ovulation)
                .fertileStart(fertileStart)
                .fertileEnd(fertileEnd)
                .currentPhase(phase)
                .phaseDay(dayInCycle)
                .cycleLength(cycleLen)
                .periodLength(periodLen)
                .phaseSuggestion(suggestion)
                .moodExpectation(mood)
                .energyLevel(energy)
                .careTip(careTip)
                .build();
    }

    public Cycle save(CycleRequest req, Long userId) {
        Cycle cycle = Cycle.builder()
                .userId(String.valueOf(userId))
                .lastPeriodDate(req.getLastPeriodDate())
                .cycleLength(req.getCycleLength() > 0 ? req.getCycleLength() : 28)
                .periodLength(req.getPeriodLength() > 0 ? req.getPeriodLength() : 5)
                .build();
        return cycleRepository.save(cycle);
    }

    public List<Cycle> getAllByUser(Long userId) {
        return cycleRepository.findByUserId(String.valueOf(userId));
    }

    public void delete(Long cycleId, Long userId) {
        Cycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new RuntimeException("Cycle entry not found"));
        if (!cycle.getUserId().equals(String.valueOf(userId))) {
            throw new RuntimeException("Unauthorized");
        }
        cycleRepository.deleteById(cycleId);
    }
}
