Feature: Compare responses from multiple LLMs
  As a logged-in user
  I want to send one prompt to multiple selected LLMs
  So that I can compare answers in the same conversation

  Scenario: Send one prompt to multiple models
    Given I am logged in and on the dashboard
    And I have selected multiple models
    When I enter a prompt in the chat box and click "Send"
    Then I should see a response from each selected model
