# 1. Start with a lightweight version of Node.js
FROM node:18-alpine

# 2. Create a folder inside the container for your app
WORKDIR /app

# 3. Copy only package files first (helps Docker cache dependencies and build faster)
COPY package*.json ./

# 4. Install your project dependencies
RUN npm install

# 5. Copy the rest of your project files (views, public, models, index.js, etc.)
COPY . .

# 6. Expose the port your Express app uses
EXPOSE 8080

# 7. Tell Docker how to start your app
CMD ["node", "index.js"]
