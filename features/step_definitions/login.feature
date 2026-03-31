Feature: Login functionality

  Scenario: User logs in with valid credentials
    Given I open the login page
    When I enter username "admin"
    And I enter password "1234"
    And I click the login button
    Then I should see a success message