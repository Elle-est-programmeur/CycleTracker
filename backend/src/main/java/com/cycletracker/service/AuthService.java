package com.cycletracker.service;

import com.cycletracker.dto.auth.AuthResponse;
import com.cycletracker.dto.auth.LoginRequest;
import com.cycletracker.dto.auth.RegisterRequest;
import com.cycletracker.entity.User;
import com.cycletracker.repository.UserRepository;
import com.cycletracker.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authManager;

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("An account with this email already exists");
        }
        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .build();
        userRepository.save(user);
        return new AuthResponse(jwtService.generateToken(user.getEmail()), user.getName(), user.getEmail());
    }

    public AuthResponse login(LoginRequest req) {
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
        );
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return new AuthResponse(jwtService.generateToken(user.getEmail()), user.getName(), user.getEmail());
    }
}
