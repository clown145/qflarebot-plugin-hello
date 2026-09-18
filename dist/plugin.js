// ../qqbot-workers/packages/sdk/src/keyboard.ts
function baseButton(label, action, o) {
  const btn = { render_data: { label }, action };
  if (o.id) btn.id = o.id;
  if (o.visitedLabel) btn.render_data.visited_label = o.visitedLabel;
  if (o.style !== void 0) btn.render_data.style = o.style;
  if (o.groupId) btn.group_id = o.groupId;
  action.permission = o.permission ?? { type: 2 };
  if (o.modal) action.modal = typeof o.modal === "string" ? { content: o.modal } : o.modal;
  if (o.unsupportTips) action.unsupport_tips = o.unsupportTips;
  return btn;
}
var button = {
  /** 打开链接或小程序 */
  link(label, url, o = {}) {
    return baseButton(label, { type: 0, data: url }, o);
  },
  /** 回调后台：触发 INTERACTION_CREATE，插件用 `buttons` 匹配器接收 */
  callback(label, data, o = {}) {
    return baseButton(label, { type: 1, data }, o);
  },
  /** 把指令填入输入框；`enter` 为 true 时直接发送（仅单聊） */
  command(label, data, o = {}) {
    const action = { type: 2, data };
    if (o.enter !== void 0) action.enter = o.enter;
    if (o.reply !== void 0) action.reply = o.reply;
    if (o.anchor !== void 0) action.anchor = o.anchor;
    return baseButton(label, action, o);
  }
};
function keyboard(rows) {
  return { content: { rows: rows.map((buttons) => ({ buttons })) } };
}

// ../qqbot-workers/packages/sdk/src/plugin.ts
function definePlugin(definition) {
  return definition;
}

// src/index.ts
var index_default = definePlugin({
  // 包名去掉 qqbot-plugin- 前缀的短名，同时是 KV 前缀、D1 表前缀与路由 /p/<name>/
  // 构建时会校验它与 package.json 的 name 对得上
  name: "hello",
  displayName: "Hello \u63D2\u4EF6",
  description: "\u6F14\u793A\u547D\u4EE4\u3001\u6B63\u5219\u3001\u4E8B\u4EF6\u4E0E\u6309\u952E\u7684\u6700\u5C0F\u63D2\u4EF6",
  // 仅供安装前展示，运行时不强制（插件与核心同 isolate，无法沙箱）
  permissions: ["kv"],
  configSchema: {
    type: "object",
    properties: {
      greeting: { type: "string", title: "\u95EE\u5019\u8BED", default: "\u4F60\u597D" }
    },
    required: ["greeting"]
  },
  defaultConfig: { greeting: "\u4F60\u597D" },
  commands: {
    // 最简形式：函数的返回值就是回复（字符串或消息对象）
    hello: ({ ctx, argText }) => `${ctx.config.greeting} ${argText}`.trim(),
    // 需要描述、别名、优先级时用对象形式；生成器可以连续回复多条
    count: {
      description: "\u6570\u5230 N",
      usage: "/count [N]",
      aliases: ["\u6570\u6570"],
      async *handler({ args }) {
        const n = Math.min(5, Number(args[0]) || 3);
        for (let i = 1; i <= n; i++) yield `${i}`;
      }
    },
    // 带按键的消息：keyboard 会自动把消息升级为 markdown
    menu: () => ({
      text: "\u9009\u4E00\u4E2A\uFF1A",
      keyboard: keyboard([[button.callback("\u786E\u8BA4", "yes", { id: "confirm" }), button.command("\u518D\u6765\u4E00\u6B21", "/menu", { enter: true })]])
    }),
    // 需要更多控制时直接用 session / ctx，不返回即可
    remember: async ({ session, ctx, argText }) => {
      await ctx.kv.put(`note:${session.userId}`, argText);
      await session.reply("\u8BB0\u4F4F\u4E86");
    }
  },
  // 以模式为键；`/…/i` 形式可带 flags
  regex: {
    "/^ping$/i": () => "pong"
  },
  // 以事件名为键；入群事件支持 event_id 被动回复，不消耗主动消息额度
  events: {
    "qq.group.robot_added": ({ ctx }) => `${ctx.config.greeting}\uFF0C\u6211\u662F\u793A\u4F8B\u673A\u5668\u4EBA\uFF0C\u53D1\u9001 /hello \u8BD5\u8BD5`
  },
  // 回调按键：key 是发送时设置的按键 id。返回消息即回复；返回数字则作为回应平台的 code
  buttons: {
    confirm: ({ buttonData }) => `\u5DF2\u786E\u8BA4\uFF08${buttonData}\uFF09`
  }
});
export {
  index_default as default
};
