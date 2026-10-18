import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AI_API_URL } from "../constants/api";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export default function ChatbotScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I'm your Campus Assistant. Ask me about campus facilities, occupancy, energy, or maintenance.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const question = input.trim();

    if (!question || loading) return;

    setInput("");

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now().toString(),
        role: "user",
        text: question,
      },
    ]);

    setLoading(true);

    try {
      const response = await fetch(
        `${AI_API_URL.replace(/\/$/, "")}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: question }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Chat request failed.");
      }

      const answer =
        data.answer ??
        data.response ??
        data.context ??
        data.message ??
        JSON.stringify(data, null, 2);

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text:
            typeof answer === "string"
              ? answer
              : JSON.stringify(answer, null, 2),
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          text:
            error instanceof Error
              ? `Unable to connect: ${error.message}`
              : "Unable to connect to the campus server.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Campus Assistant</Text>
        <Text style={styles.subtitle}>
          Ask questions about your campus
        </Text>
      </View>

      <FlatList
        style={styles.chat}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user"
                ? styles.userBubble
                : styles.assistantBubble,
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a campus question..."
          multiline
          maxLength={1000}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.sendButton, loading && styles.disabled]}
          onPress={sendMessage}
          disabled={loading || !input.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  header: {
    backgroundColor: "#173B70",
    padding: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#DCE8F8",
    marginTop: 5,
  },
  chat: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    gap: 12,
  },
  bubble: {
    maxWidth: "88%",
    padding: 13,
    borderRadius: 14,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#D8E9FF",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E7EF",
  },
  messageText: {
    color: "#172033",
    fontSize: 15,
    lineHeight: 22,
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loadingText: {
    color: "#64748B",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E1E7EF",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 44,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#172033",
  },
  sendButton: {
    backgroundColor: "#173B70",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  sendText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});