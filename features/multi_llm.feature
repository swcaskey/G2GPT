Feature: Compare responses from multiple LLMs
  As a logged-in user
  I want to send one prompt to multiple selected LLMs
  So that I can compare answers in the same conversation

  Scenario: Send one prompt to multiple models
    Given I am logged in and on the dashboard
    And I have selected multiple models
    When I enter a prompt in the chat box and click "Send"
    Then I should see a response from each selected model
  
  Scenario: Send one prompt to only two selected models
    Given I am logged in and on the dashboard
    And I have selected only llama3.2 and mistral
    When I enter a prompt in the chat box and click "Send"
    Then I should see responses only from llama3.2 and mistral

  Scenario: Send multiple prompts and receive multi-LLM responses each time
   Given I am logged in and on the dashboard
   And I have selected multiple models
   When I send multiple prompts in the chat
   Then each prompt should receive responses from each selected model
