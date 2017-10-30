# powerbi-auth-app
## App Example for Using [Power BI JS API](https://github.com/Microsoft/PowerBI-JavaScript) based on auth flow from [article](http://telegra.ph/Power-BI-JS-API-09-21)

### App Config

**Redirect URI** of an App should be URI of described HTML-page
**Redis** should store webapp-user-specific info in format (key for info is `webapp_subject:webapp_login`):
```json
{
  "login": "WEBAPP_USER_LOGIN",
  "password": "WEBAPP_USER_PASSWORD",
  "client_name": "WEBAPP_USER_NAME",
  "reportId": "PBI_ASSOCIATED_REPORTID",
  "groupId": "PBI_ASSOCIATED_GROUPID"
}
```
One can extend object with user-specific info, for example, whether user have edit permissions for report or not.

`powerbi.js` located [here](https://github.com/Microsoft/PowerBI-JavaScript/tree/master/dist)

### Requirements

 * PHP >= 5.7
 * Vue JS >= 2.0
 * Redis
 * JQuery >= 3.0.0
 * [Cookie JS](https://github.com/js-cookie/js-cookie)
