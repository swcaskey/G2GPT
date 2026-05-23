Feature: Multi-model response comparison

  Scenario: User submits one prompt and sees multiple model responses
    Given I am on the dashboard page
    When I enter a prompt in the chat box
    And I click the send button
    Then I should see the multi-model response area