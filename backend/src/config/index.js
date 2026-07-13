import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  projectsDir: process.env.PROJECTS_DIR || './projects',
};

export default config;
