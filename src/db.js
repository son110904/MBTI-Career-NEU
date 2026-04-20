import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mbti_log', // DB bạn tạo
  password: '123456',  // password lúc cài
  port: 5432,
});

export default pool;