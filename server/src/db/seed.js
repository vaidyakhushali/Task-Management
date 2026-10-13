import dotenv from "dotenv";
import connectDB from "./index.js";
import { User } from "../models/user.model.js";
import { ensureAdminUser } from "./ensure-admin.js";

dotenv.config({ path: "./.env" });

async function seedData() {
  try {
    await connectDB();
    console.log(" Connected to MongoDB for seeding...");

    await ensureAdminUser();

    // Create demo standard users if they don't exist
    const demoUsers = [
      {
        fullname: "abc ",
        username: "abc",
        email: "abc@taskmanagement.com",
        password: "user123",
        role: "User",
      },
      {
        fullname: "def ",
        username: "def",
        email: "def@taskmanagement.com",
        password: "user123",
        role: "User",
      },
      {
        fullname: "ghi ",
        username: "ghi",
        email: "ghi@taskmanagement.com",
        password: "user123",
        role: "User",
      },
    ];

    const users = [];
    for (const u of demoUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create(u);
        console.log(` Created demo user: ${u.email}`);
      }
      users.push(user);
    }

    console.log(" Database seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedData();
