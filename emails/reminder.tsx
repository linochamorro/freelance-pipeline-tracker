import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ReminderEmailProps {
  staleCount?: number;
  dashboardLink?: string;
}

export default function ReminderEmail({
  staleCount = 0,
  dashboardLink = "",
}: ReminderEmailProps) {
  const label = staleCount === 1 ? "oportunidad" : "oportunidades";

  return (
    <Html>
      <Head />
      <Preview>
        Tienes {staleCount.toString()} {label} inactivas para revisar
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Recordatorio de seguimiento</Heading>
          <Text style={text}>
            Tienes {staleCount.toString()} {label} en tu pipeline{" "}
            que no han sido actualizadas recientemente.
          </Text>
          <Section style={buttonContainer}>
            <Text style={text}>
              <a href={dashboardLink} style={link}>
                Ver tu pipeline
              </a>
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Freelance Pipeline Tracker
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
  margin: "0 0 16px",
};

const text = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#525252",
  margin: "0 0 16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const hr = {
  borderColor: "#e5e5e5",
  margin: "20px 0",
};

const link = {
  color: "#171717",
  fontWeight: "600",
};

const footer = {
  color: "#a3a3a3",
  fontSize: "12px",
};
