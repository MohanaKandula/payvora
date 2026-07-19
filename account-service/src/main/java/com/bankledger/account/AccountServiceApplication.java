package com.bankledger.account;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@SpringBootApplication
public class AccountServiceApplication {

    static {
        loadDotenv();
    }

    public static void main(String[] args) {
        SpringApplication.run(AccountServiceApplication.class, args);
    }

    private static void loadDotenv() {
        Path envPath = Paths.get(".env");
        if (!Files.exists(envPath)) {
            // Check parent directory
            envPath = Paths.get("../.env");
        }
        if (Files.exists(envPath)) {
            try {
                List<String> lines = Files.readAllLines(envPath);
                int loadedCount = 0;
                for (String line : lines) {
                    String clean = line.trim();
                    if (clean.isEmpty() || clean.startsWith("#")) {
                        continue;
                    }
                    int equalsIdx = clean.indexOf('=');
                    if (equalsIdx > 0) {
                        String key = clean.substring(0, equalsIdx).trim();
                        String value = clean.substring(equalsIdx + 1).trim();
                        if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
                            value = value.substring(1, value.length() - 1);
                        } else if (value.startsWith("'") && value.endsWith("'") && value.length() >= 2) {
                            value = value.substring(1, value.length() - 1);
                        }
                        if (System.getProperty(key) == null && System.getenv(key) == null) {
                            System.setProperty(key, value);
                            loadedCount++;
                        }
                    }
                }
                System.out.println("[Dotenv] Loaded " + loadedCount + " environment variables from " + envPath.toAbsolutePath());
            } catch (IOException e) {
                System.err.println("[Dotenv] Failed to read .env file: " + e.getMessage());
            }
        } else {
            System.out.println("[Dotenv] No .env file found in " + Paths.get(".").toAbsolutePath());
        }
    }
}
