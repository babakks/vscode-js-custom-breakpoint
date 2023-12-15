# JS/TS Custom Breakpoint

This is a VS Code extension that lets you set breakpoints in JavaScript/TypeScript source codes that bound to their call-stack. This is a useful, when you're debugging complicated, highly-coupled, or recursive structures.

The extension does it's job by creating *conditional* breakpoints that check the stack trace to match the same trace at the time of setting the breakpoint.

> ⚠️ *Currently, the extension only supports single-thread debug sessions.*

## Example use case

This is not a realistic use case, but serves the purpose here. Let's say in the code below you want to set a breakpoint on the `return` statement in the `sayHello` function. If you set an ordinary breakpoint, it'll hit by every call to `sayHello` (i.e., called by *Caller 1*, *Caller 2*, and *Caller 3*). But for some reason, you may only be interested in calls made by *Caller 1* or *Caller 2*. So, you'd need a ***call-stack bound*** breakpoint, which only hits at the desired condition.

In a narrower case, you may just want to catch the calls only made by *Caller 1*. So, you'd need a ***strictly bound*** breakpoint which also binds to the location of the caller.

```js
function sayHello() {
    return 'Hello!';  // Set a breakpoint here.
}

while (true) {
    sayHello(); // Caller 1
    sayHello(); // Caller 2
    (() => {
        sayHello(); // Caller 3
    })();
}
```

## Set a call-stack bound breakpoint

To set a call-stack bound breakpoint, follow these steps:

1. Start the debugger, and stop at the stack frame you would want to set a bounded breakpoint.
1. Put the cursor on the line you want ot set the breakpoint on.
1. Either:
   1. Set a *call-stack bound* breakpoint by running ***Set Call-Stack Bound Breakpoint*** command (via pressing <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> and typing in the command name).
   1. Set a *strictly bound* breakpoint by running ***Set Call-Stack Bound Breakpoint (Strict)*** command (via pressing <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> and typing in the command name).
1. A new call-stack bound breakpoint will be set on the line at the cursor location.

## Feedback

Please kindly provide your feedbacks through submitting issues/PRs in the extension's GitHub repository. 🍏
