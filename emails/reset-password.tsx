import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ResetPasswordEmailProps {
  resetLink?: string;
}

export default function ResetPasswordEmail({ resetLink = "" }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Freelance Pipeline Tracker password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>
            Someone requested a password reset for your Freelance Pipeline Tracker
            account. Click the button below to set a new password.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={resetLink}>
              Reset password
            </Button>
          </Section>
          <Text style={text}>
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            <Link href={resetLink} style={link}>
              {resetLink}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const h1 = {
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.3",
};

const text = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#525252",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#171717",
  borderRadius: "8px",
  color: "#fafafa",
  fontSize: "14px",
  fontWeight: "600",
  padding: "12px 24px",
};

const hr = {
  borderColor: "#e5e5e5",
  margin: "20px 0",
};

const link = {
  fontSize: "12px",
  color: "#a3a3a3",
};

const footer = {
  color: "#a3a3a3",
  fontSize: "12px",
};
