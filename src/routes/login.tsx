import { useSubmission, type RouteSectionProps } from "@solidjs/router";
import CircleAlert from "lucide-solid/icons/circle-alert";
import { JSXElement, Show } from "solid-js";
import { loginOrRegister } from "~/lib/auth";
import { Button } from "~/solid-daisy-components/components/Button";
import { Fieldset, Label } from "~/solid-daisy-components/components/Fieldset";
import { Input } from "~/solid-daisy-components/components/Input";
import { Radio } from "~/solid-daisy-components/components/Radio";

export const LOGIN_ROUTE = "/login";

const Card = (props: { children: JSXElement }): JSXElement => {
  return (
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
      <div class="card-body">{props.children}</div>
    </div>
  );
};

const CardHeading = (props: { title: string }): JSXElement => {
  return (
    <h1 class="card-title text-2xl font-bold text-center w-full">
      {props.title}
    </h1>
  );
};

export default function Login(props: RouteSectionProps) {
  const loggingIn = useSubmission(loginOrRegister);

  return (
    <main class="min-h-screen flex items-center justify-center">
      <Fieldset class="w-xs bg-base-200 border border-base-300 p-4 rounded-box">
        <Fieldset.Legend>User Authentication</Fieldset.Legend>
        <form action={loginOrRegister} method="post">
          <input
            type="hidden"
            name="redirectTo"
            value={props.params.redirectTo ?? "/"}
          />

          <AccountActionSelector />

          <Label>Username</Label>
          <Input
            id="username-input"
            name="username"
            type="text"
            placeholder="Enter username"
            required
            autocomplete="username"
          />

          <Label class="mt-4">Password</Label>

          <Input
            id="password-input"
            name="password"
            type="password"
            placeholder="Enter password (32 char)"
            required
            autocomplete="current-password"
          />

          <Button
            type="submit"
            class="w-full mt-6"
            color="primary"
            disabled={loggingIn.pending}
          >
            <Show when={loggingIn.pending} fallback="Continue">
              <span class="loading loading-spinner"></span>
            </Show>
          </Button>

          <Show when={loggingIn.result}>
            <div class="alert alert-error">
              <CircleAlert class="stroke-current shrink-0 h-6 w-6" />
              <span role="alert" id="error-message">
                {loggingIn.result!.message}
              </span>
            </div>
          </Show>
        </form>
      </Fieldset>
    </main>
  );
}

const FormLabel = (props: { label: string }) => {
  return (
    <label class="label">
      <span class="label-text font-medium">{props.label}</span>
    </label>
  );
};

const AccountActionSelector = () => {
  return (
    <div>
      <Fieldset class="w-xs bg-base-300/10 border border-base-300 p-4 rounded-box flex gap-4">
        <Fieldset.Legend class="label mb-2"> Account Action</Fieldset.Legend>
        <Label>Login</Label>
        <Radio name="loginType" value="login" checked={true} />
        <Label>Register</Label>
        <Radio name="loginType" value="register" checked={false} />
      </Fieldset>
    </div>
  );
};
