import pymysql

def run_migration():
    conn = pymysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='ROOT',
        database='chatapp'
    )
    cur = conn.cursor()
    
    cur.execute("SHOW COLUMNS FROM messages")
    columns = [row[0] for row in cur.fetchall()]
    print("Initial columns in messages:", columns)

    if 'reply_to_id' not in columns:
        print("Adding reply_to_id column...")
        cur.execute("ALTER TABLE messages ADD COLUMN reply_to_id BIGINT NULL")
        try:
            cur.execute("ALTER TABLE messages ADD CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL")
        except Exception as e:
            print("Constraint note:", e)
        conn.commit()

    if 'is_edited' not in columns:
        print("Adding is_edited column...")
        cur.execute("ALTER TABLE messages ADD COLUMN is_edited TINYINT(1) NOT NULL DEFAULT 0")
        conn.commit()

    if 'edited_at' not in columns:
        print("Adding edited_at column...")
        cur.execute("ALTER TABLE messages ADD COLUMN edited_at DATETIME NULL")
        conn.commit()

    if 'is_deleted' not in columns:
        print("Adding is_deleted column...")
        cur.execute("ALTER TABLE messages ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0")
        conn.commit()

    cur.execute("DESCRIBE messages")
    print("\nUpdated schema:")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]} (Null={row[2]}, Default={row[4]})")

    cur.close()
    conn.close()
    print("\nMigration completed successfully!")

if __name__ == "__main__":
    run_migration()
