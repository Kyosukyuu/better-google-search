// ==UserScript==
// @name          Better Google Search
// @namespace     Better Google Search
// @match         https://www.google.com/search?*
// @grant         GM_addStyle
// @require       https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant         GM_getValue
// @grant         GM_setValue
// @version       1.0
// @author        kyosukyuu
// @description   Adds useful features for google searching. English support only. Tested on Brave Browser. Intended to work with light mode and dark mode. Doesn't work on mobile view.
// @license       MIT
// ==/UserScript==

GM_addStyle(`
  .btns--container {
    display: flex;
    position: absolute;
    width: 100%;
    left: 100%;
    top: 0;
    margin-left: 20px;
    z-index: 1;
    background: #202124;
  }
  .btns--container-light {
    background: #fff;
  }
  .btn {
    margin-right: 8px;
    cursor: pointer;
  }
  .btn--container {
    position: relative;
    padding: 4px;
    margin: 0 8px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -o-user-select: none;
    user-select: none;
  }
  .btn--container-light {
    color: #70757a !important;
  }
  .btn--container:hover {
    color: #ddd
  }
  .btn--container-light:hover {
    color: #202124 !important;
  }
/*   .btn--container:hover .caret-dropdown {
    border-color: #ddd transparent;
  }
  .btn--container-light:hover .caret-dropdown {
    border-color: #202124 transparent !important;
  }
 */
  .btn--active {
    color: #e8eaed !important;
  }
  .btn--active-light {
    color: #202124;
  }
  .caret-dropdown--active {
    border-color: #ddd transparent !important;
  }

  .btn--caret::after{
    border-color: #9aa0a6 transparent;
    border-style: solid;
    border-width: 5px 4px 0 4px;
    width: 0;
    height: 0;
    margin-left: 2px;
    top: 13px;
    margin-top: -2px;
    position: absolute;
    right: 0;
    content: " "
  }
  .btn--caret:hover::after, .btn--caret:focus::after {
    border-color: #ddd transparent !important;
  }
  .btn--container:hover > .btn--caret::after {
    border-color: #ddd transparent !important;
  }
  .btn--container-light:hover > .btn--caret::after {
    border-color: #202124 transparent !important;
  }

/*   .caret-dropdown {
    border-color: #9aa0a6 transparent;
    border-style: solid;
    border-width: 5px 4px 0 4px;
    width: 0;
    height: 0;
    margin-left: 2px;
    top: 13px;
    margin-top: -2px;
    position: absolute;
    right: 0;
  } */

  .dropdown--container {
    z-index: 10;
    padding: 5px 0;
    border-radius: 8px;
    box-shadow: 1px 1px 15px 0px #171717;
    background-color: #202124;
    position: absolute;
    width: 100%;
    min-width: 80px;
    max-width: 105px;
    top: 25px;
    overflow: hidden;
    list-style-type: none;
  }
  .dropdown--container-light {
    box-shadow: 0 2px 10px 0 rgb(0 0 0 / 20%);
    background-color: #fff;
  }
  .show {
    display: block !important;
  }
  .hide {
    display: none;
  }

  .dropdown--items {
    line-height: 16px;
    padding: 7px 8px;
    color: #bdc1c6;
    display: flex;
    align-items: center;
    cursor: pointer;
    margin: auto;
  }
  .dropdown--items-light {
    color: #5f6368;
  }
  .dropdown--items:hover, .dropdown--items:focus {
    background-color: rgba(255,255,255,0.1);
  }
  .dropdown--items-light:hover, .dropdown--items-light:focus{
    background-color: rgba(0,0,0,0.1) !important;
  }

  @media only screen and (max-width: 1450px) {
    .btns--container {
      flex-direction: column;
      max-width: 125px;
      box-shadow: 1px 1px 3px 2px #0000003b;
    }
  }
`);

(() => {
  "use strict";

  const fieldDefs = {
    "bypass-csp": {
      section: [
        GM_config.create("Functional Settings"),
        "Affects the behavior of the script",
      ],
      label: "Bypass CSP",
      type: "checkbox",
      default: false,
    },
  };

  GM_config.init({
    id: "settings",
    title: "Better Google Search Settings",
    fields: fieldDefs,
  });

  const BYPASS_CSP = JSON.parse(GM_getValue("settings"))["bypass-csp"] || false;

  const qSelect = (selector) => document.querySelector(selector);
  const qSelectAll = (selectors) => document.querySelectorAll(selectors);

  let relativeParent =
    qSelect("input").parentElement.parentElement.parentElement.parentElement;

  // check for theme
  const getDefaultTheme = () => {
    if (window?.matchMedia("(prefers-color-scheme: dark)").matches) return true;
    return false;
  };
  const isDark = getDefaultTheme();

  // bypass content-security-policy (CSP) to allow the script to work on google images
  // WARNING: this makes innerHTML vulnerable to injection
  if (window.trustedTypes?.createPolicy && BYPASS_CSP) {
    relativeParent = qSelect("input").parentElement.parentElement.parentElement;
    window.trustedTypes.createPolicy("default", {
      createHTML: (string, sink) => string,
    });
  }

  const FILE_TYPE = "FILE_TYPE";
  const EXCLUDE = "EXCLUDE";
  const SITE = "SITE";
  const EXACT_QUERY = "EXACT_QUERY";
  const TERM_APPEARS = "TERM_APPEARS";
  const BEFORE = "BEFORE";
  const AFTER = "AFTER";
  const SETTINGS = "SETTINGS";

  // contains all possible search actions you can perform
  const actions = [
    {
      name: "File Type",
      action: FILE_TYPE,
      data: "filetype:",
      choices: [
        { name: "PDF", data: "pdf" },
        { name: "DOC", data: "doc" },
        { name: "DOCX", data: "docx" },
        { name: "TXT", data: "txt" },
        { name: "LOG", data: "log" },
        { name: "PPT", data: "ppt" },
        { name: "PPTX", data: "pptx" },
        { name: "XML", data: "xml" },
        { name: "TORRENT", data: "torrent" },
      ],
    },
    { name: "Exclude", action: EXCLUDE, data: "-", isUnique: false },
    {
      name: "Site",
      action: SITE,
      data: "site:",
      choices: [
        { name: "reddit", data: "reddit.com" },
        { name: "stack overflow", data: "stackoverflow.com" },
        { name: "youtube", data: "youtube.com" },
        { name: "twitter", data: "twitter.com" },
        { name: "facebook" },
        { name: "custom", data: "facebook.com" },
      ],
    },
    { name: "Exact Query", action: EXACT_QUERY, data: `""`, isUnique: false },
    {
      name: "Term Appears",
      action: TERM_APPEARS,
      choices: [
        { name: "anywhere in page", data: "" },
        { name: "in the title of the page", data: "allintitle:" },
        { name: "in the text of the page", data: "allintext:" },
        { name: "in the URL of the page", data: "allinurl:" },
        { name: "in links to the page", data: "allinanchor:" },
      ],
    },
    { name: "Before", action: BEFORE, data: "before:", isUnique: true },
    { name: "After", action: AFTER, data: "after:", isUnique: true },
    { name: "Settings", action: SETTINGS, isUnique: true },
  ];

  const toggleDropdown = (evt) => {
    if (evt.target !== evt.currentTarget) {
      evt.currentTarget.lastElementChild.classList.toggle("show");
      // theme dependent styles
      if (isDark) {
        evt.currentTarget.classList.toggle("btn--active");
      } else {
        evt.currentTarget.classList.toggle("btn--active-light");
      }
    }
  };

  const createButtons = () => {
    relativeParent.style.position = "relative";

    const buttonsContainer = document.createElement("section");
    relativeParent.appendChild(buttonsContainer);
    buttonsContainer.classList.add("btns--container");
    actions.forEach((action) => {
      let caretDropdown = "";
      let dropdownMenu = "";
      let hasDropdown = false;

      if (action?.choices) {
        hasDropdown = true;
        caretDropdown = `<span class="caret-dropdown"></span>`;

        // let parentAction = action.data
        let dropdownItems = action.choices
          .map(
            (item) =>
              `<li class="dropdown--items" data-action="${
                item.data
              }" data-parent-action="${action.data ? action.data : ""}">${
                item.name
              }</li>`
          )
          .join("");

        dropdownMenu = `
          <ul class="hide dropdown--container">
            ${dropdownItems}
          </ul>
        `;
      }

      if (hasDropdown) {
        buttonsContainer.innerHTML += `
          <section class="btn--container">
            <div class="btn">${action.name}</div>
            ${dropdownMenu}
          </section>
        `;
      } else {
        buttonsContainer.innerHTML += `
          <section class="btn--container">
            <div class="btn">${action.name}</div>
          </section>
        `;
      }
    });
  };

  createButtons();

  // attach buttons with dropdown function
  Array.from(qSelectAll(".btn--container")).forEach((btn) =>
    btn.addEventListener("click", toggleDropdown)
  );
  Array.from(qSelectAll(".dropdown--container")).forEach((el) => {
    el.addEventListener("click", (evt) => evt.stopPropagation());
    // add caret to buttons with dropdown
    el.previousElementSibling.classList.add("btn--caret");
  });

  // close dropdown menus when clicked on somewhere other than the dropdown areas
  window.onclick = (evt) => {
    if (!evt.target.matches(".btn")) {
      Array.from(qSelectAll(".dropdown--container")).forEach(
        (container) =>
          container.classList.contains("show") &&
          container.classList.remove("show")
      );
      Array.from(qSelectAll(".btn--active")).forEach((btn) =>
        btn.classList.remove("btn--active")
      );
    }
  };

  const attachActions = () => {
    // attach dropdown items with click handler
    Array.from(qSelectAll(".dropdown--items")).forEach((item) => {
      item.addEventListener("click", (evt) => {
        const parentAction =
          evt.currentTarget.getAttribute("data-parent-action");
        const action = evt.currentTarget.getAttribute("data-action");

        const input = qSelect("input");

        // check if unused query already exists
        const expression = new RegExp(
          `(${parentAction}\\w+\\.\\w+|${parentAction}\\w+|${parentAction})`,
          "g"
        );
        if (parentAction && input.value.match(expression)) {
          input.value = input.value.replace(
            expression,
            (search) => `${parentAction}${action}`
          );

          if (parentAction === "site:") {
            const searchPos = input.value.search(/(site:)/);
            input.setSelectionRange(
              searchPos + parentAction.length,
              searchPos + parentAction.length
            );
          }

          input.focus();
          return;
        }
        // remove excess spaces
        input.value = input.value.replace(/\s{2,}/g, (search) => " ");

        // apply changes to search bar value
        input.value += ` ${parentAction}${action} `;

        // trim and remove excess spaces
        input.value = input.value.trim().replace(/\s{2,}/g, (search) => " ");

        // focus on search bar
        input.focus();
      });
    });

    // attach non-having dropdown items with click handler
    Array.from(qSelectAll(".btn--container")).forEach((el, i) => {
      if (el.childElementCount === 1) {
        el.firstElementChild.addEventListener("click", (evt) => {
          const action = actions[i].data;

          if (actions[i].action === SETTINGS) {
            GM_config.open();
            return;
          }

          const input = qSelect("input");

          // check if query is unique (only one of it should exist)
          const queryExists = new RegExp(`${action}`);
          if (actions[i].isUnique && input.value.match(queryExists)) {
            const searchPos = input.value.search(queryExists);
            input.setSelectionRange(
              searchPos + action.length,
              searchPos + action.length
            );
            input.focus();
            return;
          }

          // check if unused query is already in search bar
          const expression = new RegExp(
            `(${action}\\W)|(\\W${action}\\B)`,
            "g"
          );
          if (input.value.match(expression)) {
            // set cursor at unused query
            const searchPos = input.value.search(expression);

            if (action.length > 2)
              input.setSelectionRange(
                searchPos + action.length + 1,
                searchPos + action.length + 1
              );
            else input.setSelectionRange(searchPos + 2, searchPos + 2);
          } else {
            input.value = input.value.trim();
            // apply changes to search bar value
            input.value += ` ${action} `;
            input.value = input.value.trim();
          }

          if (action === `""`) {
            const quotationsPos = input.value.search(`""`);
            input.setSelectionRange(quotationsPos + 1, quotationsPos + 1);
          }
          //focus on search bar
          input.focus();
        });
      }
    });
  };

  attachActions();

  if (!isDark) {
    Array.from(qSelectAll(".btns--container")).forEach((el) =>
      el.classList.add("btns--container-light")
    );
    Array.from(qSelectAll(".btn--container")).forEach((el) =>
      el.classList.add("btn--container-light")
    );
    Array.from(qSelectAll(".dropdown--container")).forEach((el) =>
      el.classList.add("dropdown--container-light")
    );
    Array.from(qSelectAll(".dropdown--items")).forEach((el) =>
      el.classList.add("dropdown--items-light")
    );
  }
})();
