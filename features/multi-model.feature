Feature: Multi-model chat
  As a logged-in user
  I want to choose models and receive labeled responses
  So that I can compare and look for AI hallucinations.

  Scenario: Select models from the selector
    Given I am logged in as a seeded acceptance user
    When I open the model selector and choose one model
    Then exactly one model should be selected
    When I open the model selector and choose a second model
    Then exactly two models should be selected

  Scenario: Cross-checking a response across LLMs
    Given I am an authenticated user on the multi-model interface
    When I submit a factual question asking "When and where was the Declaration of Independence signed?"
    Then the system should query the LLMs I selected simultaneously
    And I should see distinct responses displayed side-by-side on the screen
