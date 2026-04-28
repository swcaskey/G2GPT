Feature: Multi-Model Fact Verification
  As a researcher
  I want to run my prompts through multiple LLMs
  So that I can compare their answers and avoid AI hallucinations

  Scenario: Cross-checking a factual question across three LLMs
    Given I am an authenticated user on the multi-model interface
    When I submit a factual question asking "What were the main causes of the fall of Rome?"
    Then the system should query three different LLMs simultaneously
    And I should see three distinct responses displayed side-by-side on the screen
