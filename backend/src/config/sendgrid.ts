// SendGrid email config placeholder
// Will be configured in a later phase

import { env } from "./env.ts";

export const sendgridConfig = {
  apiKey: env.SENDGRID_API_KEY,
  fromEmail: env.SENDGRID_FROM_EMAIL,
};

// TODO: Initialize SendGrid
// import sgMail from "@sendgrid/mail";
// if (sendgridConfig.apiKey) {
//   sgMail.setApiKey(sendgridConfig.apiKey);
// }
// export { sgMail };
