import sys
import re

filepath = r"d:\projects\IFDC asssets website\frontend\src\pages\UsersDashboard.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Match the global columns
columns_match = re.search(r'(const columns: Column<User>\[\] = \[\s*\{.*?\n\];)\n+(export function UsersDashboard)', content, flags=re.DOTALL)
if not columns_match:
    print(f"Could not find columns in {filepath}")
    sys.exit(1)

columns_code = columns_match.group(1)
func_decl = columns_match.group(2)

# Insert the Actions column
# We will just append it before '];'
columns_code = re.sub(
    r'(\n\];)', 
    r""",
    {
        key: 'id',
        header: 'Actions',
        sortable: false,
        render: (row) => (
            <div className="flex items-center gap-3">
                <button
                    onClick={() => {
                        toast('Edit functionality coming soon.', { icon: '👏' });
                    }}
                    className="text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
                >
                    Edit
                </button>
                <button
                    onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this user?')) {
                            try {
                                await userService.deleteUser(row.id);
                                toast.success('User deleted successfully');
                                fetchUsers();
                            } catch (e) {
                                toast.error('Failed to delete user');
                            }
                        }
                    }}
                    className="text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
                >
                    Delete
                </button>
            </div>
        )
    }
];""", 
    columns_code
)

# Insert inside the component
content = content[:columns_match.start()] + func_decl + "\n\n    " + columns_code + "\n" + content[columns_match.end():]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"Patched {filepath}")
