// Registers Hook Lab's operations with the agent runtime.
// agent-manifest.json loads this module through "actions.module". Only the names in
// "actions.agentTools" become model tools, called website_<name>.
import { App, LANGUAGES, PLATFORMS, STYLES } from "./js/lab.js";

const text = (description, maxLength) => ({type: "string", minLength: 1, maxLength, description});
const score = (description) => ({type: "integer", minimum: 1, maximum: 10, description});

class SiteActions {
  static registerActions(actions) {
    actions.register({
      name: "get_lab_state",
      description: "Read the lab settings (topic, audience, platform, language), the limits, the saved hooks with styles and scores, the title ideas, the winner, and the link to Creator Agent Studio.",
      effect: "read",
      inputSchema: {type: "object", properties: {}, additionalProperties: false},
      execute: () => App.page.getState(),
    });
    actions.register({
      name: "set_lab_settings",
      description: "Change the lab settings shown on the page. Give only the fields the visitor asked to change. A new topic clears the old hooks.",
      effect: "write",
      inputSchema: {
        type: "object", additionalProperties: false,
        properties: {
          topic: text("The topic, in the visitor's words.", 300),
          audience: {type: "string", maxLength: 200, description: "Who it is for."},
          platform: {type: "string", enum: PLATFORMS, description: "Where the hook will open."},
          language: {type: "string", enum: LANGUAGES, description: "Language of the hooks and titles."},
        },
      },
      execute: (args) => App.page.setSettings(args),
    });
    actions.register({
      name: "save_hooks",
      description: "Save 4 to 8 hooks (each one style, at least 3 styles, each fits one X post) and 2 to 6 title ideas (100 characters max). Replaces earlier hooks and clears scores.",
      effect: "write",
      inputSchema: {
        type: "object", additionalProperties: false, required: ["hooks", "titles"],
        properties: {
          hooks: {type: "array", minItems: 4, maxItems: 8, items: {type: "object", additionalProperties: false, required: ["text", "style"], properties: {text: text("The opening line or two, as spoken or posted.", 400), style: {type: "string", enum: STYLES}}}},
          titles: {type: "array", minItems: 2, maxItems: 6, items: text("A video or post title.", 200)},
        },
      },
      execute: (args) => App.page.saveHooks(args),
    });
    actions.register({
      name: "save_hook_scores",
      description: "Score every saved hook, in order, 1 to 10 on curiosity, clarity and promise, with a short note each, then name the winner by number and give a one-sentence verdict.",
      effect: "write",
      inputSchema: {
        type: "object", additionalProperties: false, required: ["scores", "winner"],
        properties: {
          scores: {type: "array", minItems: 4, maxItems: 8, items: {type: "object", additionalProperties: false, required: ["curiosity", "clarity", "promise"], properties: {curiosity: score("Does it open a gap the viewer must close?"), clarity: score("Is it instantly clear who and what it is about?"), promise: score("Does it promise a payoff the content can deliver?"), note: {type: "string", maxLength: 200, description: "One short reason."}}}},
          winner: {type: "integer", minimum: 1, maximum: 8, description: "The winning hook's number."},
          verdict: {type: "string", maxLength: 400, description: "One sentence on why it wins."},
        },
      },
      execute: (args) => App.page.saveScores(args),
    });
  }
}

export const registerActions = SiteActions.registerActions;
