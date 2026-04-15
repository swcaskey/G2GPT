Feature: Multi-model chat
  As a logged-in user
  I want to choose models and receive labeled responses
  So that I can compare and resume model-specific replies

  Scenario: Select one or two models from the selector
    Given I am logged in as a seeded acceptance user
    When I open the model selector and choose one model
    Then exactly one model should be selected
    When I open the model selector and choose a second model
    Then exactly two models should be selected

  Scenario: Send one prompt to two models and see both responses
    Given I am logged in as a seeded acceptance user
    And I have selected two models
    When I send a multi-model prompt
    Then I should see labeled responses for both selected models

  Scenario: Resume conversation keeps model labels
    Given I am logged in as a seeded acceptance user
    And I have selected two models
    When I send a multi-model prompt
    And I reload and reopen the latest conversation
    Then the reopened conversation should show model labels
