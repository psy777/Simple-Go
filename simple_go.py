import pygame
import sys
import tkinter as tk
from tkinter import simpledialog

def ask_board_size():
    root = tk.Tk()
    root.withdraw()  # Hide the main window
    board_size = simpledialog.askinteger("Input", "What size board do you want? (e.g., 9, 13, 19)", minvalue=9, maxvalue=19)
    root.destroy()
    return board_size

BOARD_SIZE = ask_board_size()
if BOARD_SIZE is None:
    print("No board size selected. Exiting.")
    sys.exit()

# Global variables for sizes, images, and original image assets
SQUARE_SIZE = 0
BORDER_SIZE = 0
BOARD_PIXELS = 0
STONE_RADIUS = 0

BLACK_STONE_ORIG = None
WHITE_STONE_ORIG = None

BLACK_STONE = None
WHITE_STONE = None
BLACK_STONE_PREVIEW = None
WHITE_STONE_PREVIEW = None
BACKGROUND = None

def load_background_resized(board_size, current_square_size):
    if board_size == 0 or current_square_size == 0:
        return pygame.Surface((1, 1), pygame.SRCALPHA) 
    image_path = f'{board_size}_by_{board_size}_board.png'
    try:
        img = pygame.image.load(image_path)
        return pygame.transform.scale(img, (current_square_size * board_size, current_square_size * board_size))
    except pygame.error as e:
        print(f"Error loading or scaling background image {image_path}: {e}")
        placeholder_size = max(1, current_square_size * board_size) # Ensure positive size
        surf = pygame.Surface((placeholder_size, placeholder_size))
        surf.fill((200, 200, 200)) # Light grey placeholder
        return surf

def update_sizes_and_images(window_width, window_height):
    global SQUARE_SIZE, BORDER_SIZE, BOARD_PIXELS, STONE_RADIUS
    global BLACK_STONE, WHITE_STONE, BLACK_STONE_PREVIEW, WHITE_STONE_PREVIEW, BACKGROUND
    global BOARD_SIZE, BLACK_STONE_ORIG, WHITE_STONE_ORIG

    if BOARD_SIZE is None or BOARD_SIZE == 0:
        return

    # Calculate new SQUARE_SIZE based on window dimensions
    # The board display area is (BOARD_SIZE + 1) effective squares wide/high due to borders
    new_square_size_w = window_width // (BOARD_SIZE + 1) if (BOARD_SIZE + 1) > 0 else window_width
    new_square_size_h = window_height // (BOARD_SIZE + 1) if (BOARD_SIZE + 1) > 0 else window_height
    SQUARE_SIZE = min(new_square_size_w, new_square_size_h)
    SQUARE_SIZE = max(SQUARE_SIZE, 10)  # Minimum square size

    BORDER_SIZE = SQUARE_SIZE // 2
    BOARD_PIXELS = BOARD_SIZE * SQUARE_SIZE
    STONE_RADIUS = SQUARE_SIZE // 2 - 2
    STONE_RADIUS = max(STONE_RADIUS, 1)  # Ensure positive radius

    if BLACK_STONE_ORIG and WHITE_STONE_ORIG:
        # Note: Original script uses 'white_stone.png' for black player, 'black_stone.png' for white player
        BLACK_STONE = pygame.transform.scale(BLACK_STONE_ORIG, (SQUARE_SIZE, SQUARE_SIZE))
        WHITE_STONE = pygame.transform.scale(WHITE_STONE_ORIG, (SQUARE_SIZE, SQUARE_SIZE))
        
        BLACK_STONE_PREVIEW = BLACK_STONE.copy()
        BLACK_STONE_PREVIEW.set_alpha(128)
        WHITE_STONE_PREVIEW = WHITE_STONE.copy()
        WHITE_STONE_PREVIEW.set_alpha(128)

    BACKGROUND = load_background_resized(BOARD_SIZE, SQUARE_SIZE)

class GoBoard:
    def __init__(self):
        self.board = [[' ' for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        self.players = ['B', 'W']  # B = Black, W = White
        self.current_player = 0
        self.groups = []


    def create_group(self, x,y):
        #Create a set of stones containing only the new stone
        stones = {(x, y)}

        #Create a set of liberties for the new stone
        liberties = set()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 < nx < BOARD_SIZE and 0 <= ny < BOARD_SIZE and self.board[nx][ny] == ' ':
                liberties.add((nx, ny))

        #Create a new group and add it to the list of groups 
        group = Group(self.players[self.current_player], stones, liberties)
        self.groups.append(group)
        
    def update_groups(self):
        visited = [[False for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        self.groups = []

        def dfs(x, y, color):
            if x < 0 or x >= BOARD_SIZE or y < 0 or y >= BOARD_SIZE:
                return set(), set()
            if visited[x][y] or self.board[x][y] != color:
                return set(), set()

            visited[x][y] = True
            stones = {(x, y)}
            liberties = set()

            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < BOARD_SIZE and 0 <= ny < BOARD_SIZE:
                    if self.board[nx][ny] == ' ':
                        liberties.add((nx, ny))
                    elif self.board[nx][ny] == color:
                        s, l = dfs(nx, ny, color)
                        stones |= s
                        liberties |= l

            return stones, liberties

        for x in range(BOARD_SIZE):
            for y in range(BOARD_SIZE):
                if not visited[x][y] and self.board[x][y] != ' ':
                    stones, liberties = dfs(x, y, self.board[x][y])
                    if stones:
                        self.groups.append(Group(self.board[x][y], stones, liberties))

    def make_move(self, x, y):
        if self.board[x][y] != ' ':
            print("Invalid move, the spot is already occupied.")
            return False

        # Temporarily place the stone
        self.board[x][y] = self.players[self.current_player]

        # Check for suicide move
        self.update_groups()
        suicide = False
        for group in self.groups:
            if group.player == self.players[self.current_player] and len(group.liberties) == 0:
                suicide = True
                break

        # Check for captures
        captures = [group for group in self.groups if group.player != self.players[self.current_player] and len(group.liberties) == 0]

        # If it's a suicide move and no captures, it's illegal
        if suicide and not captures:
            self.board[x][y] = ' '  # Remove the temporarily placed stone
            print("Illegal move, suicide.")
            return False

        # TODO: Implement Ko rule check here

        # If the move is legal, finalize the stone placement and update groups
        print(f"Player {self.players[self.current_player]} placed a stone at ({x+1}, {y+1})")
        for group in captures:
            for stone_x, stone_y in group.stones:
                self.board[stone_x][stone_y] = ' '
            self.groups.remove(group)
        self.current_player = (self.current_player + 1) % 2  # switch player
        return True

    
    
    def print_groups(self):
        for i, group in enumerate(self.groups, start=1):
            print(f"Group {i} (Player{group.player}):")
            print(f" Stones:", sorted(group.stones))
            print(f" Liberties:", sorted(group.liberties))

    def draw(self, screen):
        #Draw the background
        screen.blit(BACKGROUND, (BORDER_SIZE, BORDER_SIZE))

        # Draw the stones
        for x in range(BOARD_SIZE):
            for y in range(BOARD_SIZE):
                if self.board[x][y] == 'B':
                    screen.blit(WHITE_STONE, (BORDER_SIZE + x*SQUARE_SIZE, BORDER_SIZE + y*SQUARE_SIZE))
                elif self.board[x][y] == 'W':
                    screen.blit(BLACK_STONE, (BORDER_SIZE + x*SQUARE_SIZE, BORDER_SIZE + y*SQUARE_SIZE))

class Group:
    def __init__(self, player, stones=set(), liberties=set()):
        self.stones = stones
        self.liberties = liberties
        self.player = player

    def update_liberties(self, board):
        self.liberties = set()  # Clear the current liberties
        for x, y in self.stones:
            # Check each adjacent position
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < len(board) and 0 <= ny < len(board[0]) and board[nx][ny] == ' ':
                    self.liberties.add((nx, ny))

def main():
    global screen, SQUARE_SIZE, BORDER_SIZE, BOARD_PIXELS, STONE_RADIUS
    global BLACK_STONE, WHITE_STONE, BLACK_STONE_PREVIEW, WHITE_STONE_PREVIEW, BACKGROUND
    global BLACK_STONE_ORIG, WHITE_STONE_ORIG, BOARD_SIZE

    pygame.init()

    # Load original images once
    try:
        BLACK_STONE_ORIG = pygame.image.load('white_stone.png') # This is for player Black
        WHITE_STONE_ORIG = pygame.image.load('black_stone.png') # This is for player White
    except pygame.error as e:
        print(f"Error loading stone images: {e}. Exiting.")
        sys.exit()

    # Initial window dimensions - these will be used by update_sizes_and_images
    # to calculate initial SQUARE_SIZE and other metrics.
    initial_window_width = 800  # Default starting width
    initial_window_height = 800 # Default starting height
    
    screen = pygame.display.set_mode((initial_window_width, initial_window_height), pygame.RESIZABLE)
    pygame.display.set_caption("Simple Go")

    # Set initial sizes and load/scale images based on the initial window size
    update_sizes_and_images(initial_window_width, initial_window_height)
    
    # Check if resources were loaded correctly (e.g., if BOARD_SIZE was valid for image paths)
    if BACKGROUND is None or BLACK_STONE is None or WHITE_STONE is None:
        print("Failed to initialize critical game resources. Exiting.")
        # Attempt to load a fallback background if BOARD_SIZE was the issue for it
        if BACKGROUND is None and BOARD_SIZE is not None and SQUARE_SIZE > 0 :
             BACKGROUND = load_background_resized(BOARD_SIZE, SQUARE_SIZE)
        if BACKGROUND is None: # If still none, exit
            sys.exit()


    clock = pygame.time.Clock()
    board = GoBoard()

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.VIDEORESIZE:
                screen_width, screen_height = event.w, event.h
                screen = pygame.display.set_mode((screen_width, screen_height), pygame.RESIZABLE)
                update_sizes_and_images(screen_width, screen_height)
            elif event.type == pygame.MOUSEBUTTONDOWN:
                # Ensure BORDER_SIZE and SQUARE_SIZE are not zero to prevent division by zero
                if SQUARE_SIZE == 0: continue 
                
                x, y = event.pos
                # The board is drawn starting at (BORDER_SIZE, BORDER_SIZE) from top-left of the screen
                board_x = (x - BORDER_SIZE) // SQUARE_SIZE
                board_y = (y - BORDER_SIZE) // SQUARE_SIZE
                if 0 <= board_x < BOARD_SIZE and 0 <= board_y < BOARD_SIZE:
                    board.make_move(board_x, board_y)
                    board.print_groups()
        
        screen.fill((0,0,0)) # Fill screen with black to clear previous frame / handle empty space
        board.draw(screen)

        # Draw preview stone
        if SQUARE_SIZE > 0 : # Ensure SQUARE_SIZE is positive before drawing preview
            x, y = pygame.mouse.get_pos()
            board_x = (x - BORDER_SIZE) // SQUARE_SIZE
            board_y = (y - BORDER_SIZE) // SQUARE_SIZE
            if 0 <= board_x < BOARD_SIZE and 0 <= board_y < BOARD_SIZE and board.board[board_x][board_y] == ' ':
                preview_stone_surface = None
                if board.current_player == 0: # Black's turn (uses BLACK_STONE which is white_stone.png)
                    preview_stone_surface = BLACK_STONE_PREVIEW
                else: # White's turn (uses WHITE_STONE which is black_stone.png)
                    preview_stone_surface = WHITE_STONE_PREVIEW
                
                if preview_stone_surface:
                     screen.blit(preview_stone_surface, (BORDER_SIZE + board_x*SQUARE_SIZE, BORDER_SIZE + y*SQUARE_SIZE))
            # No else needed to redraw board, as screen.fill and board.draw() handle it

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()
