// imports/startup/client/routes.js
// Called from imports/startup/client/index.js

FlowRouter.route('/', {
  name: "home",
  action() {
    BlazeLayout.setRoot('body');
    BlazeLayout.render('appBody', {sidePanel: "groupKit", mainPanel: "mapPanel"});
  }
});
