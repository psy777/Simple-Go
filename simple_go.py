import pygame
import sys
import tkinter as tk
from tkinter import simpledialog

# --- Constants determined at startup ---
INITIAL_SQUARE_SIZE = 56  # Base size for initial calculation

# --- Global dynamic variables ---
# These will be updated upon window resize or initial setup
screen = None
SQUARE_SIZE = INITIAL_SQUARE_SIZE
BORDER_SIZE = SQUARE_SIZE // 2
BOARD_PIXELS = 0  # To be calculated based on BOARD_SIZE and SQUARE_SIZE
STONE_RADIUS = 0  # To be calculated

# Original images (loaded once)
ORIGINAL_BLACK_STONE_IMG = None # Will hold image from white_stone.png (used for Player W's stones)
ORIGINAL_WHITE_STONE_IMG = None # Will hold image from black_stone.png (used for Player B's stones)
ORIGINAL_BOARD_IMGS = {}  # Stores board images for different sizes (e.g., 9x9, 19x19)

# Scaled images (updated on resize)
BLACK_STONE = None # Scaled version of ORIGINAL_BLACK_STONE_IMG
WHITE_STONE = None # Scaled version of ORIGINAL_WHITE_STONE_IMG
BLACK_STONE_PREVIEW = None
WHITE_STONE_PREVIEW = None
BACKGROUND = None

# BOARD_SIZE is critical and determined first by user input
def ask_board_size():
    root = tk.Tk()
    root.withdraw()  # Hide the main window
    board_size_val = simpledialog.askinteger("Input", "What size board do you want? (e.g., 9, 13, 19)", minvalue=9, maxvalue=19)
    root.destroy()
    if board_size_val is None:
        print("No board size selected. Exiting.")
        sys.exit()
    return board_size_val

BOARD_SIZE = ask_board_size()

def load_original_images():
    global ORIGINAL_BLACK_STONE_IMG, ORIGINAL_WHITE_STONE_IMG, ORIGINAL_BOARD_IMGS
    # Stone images - "Crossed" loading logic
    try:
        # ORIGINAL_BLACK_STONE_IMG is for Player W (White), uses white_stone.png
        img_src_for_black_stone_var = pygame.image.load('white_stone.png') 
        ORIGINAL_BLACK_STONE_IMG = img_src_for_black_stone_var.convert_alpha()
    except (pygame.error, FileNotFoundError) as e:
        print(f"Error loading white_stone.png (for W player stones): {e}. Creating placeholder.")
        ORIGINAL_BLACK_STONE_IMG = pygame.Surface((INITIAL_SQUARE_SIZE, INITIAL_SQUARE_SIZE), pygame.SRCALPHA)
        ORIGINAL_BLACK_STONE_IMG.fill((0,0,0,0))
        pygame.draw.circle(ORIGINAL_BLACK_STONE_IMG, (255,255,255), (INITIAL_SQUARE_SIZE//2, INITIAL_SQUARE_SIZE//2), INITIAL_SQUARE_SIZE//2 - 2) # White circle
        
    try:
        # ORIGINAL_WHITE_STONE_IMG is for Player B (Black), uses black_stone.png
        img_src_for_white_stone_var = pygame.image.load('black_stone.png')
        ORIGINAL_WHITE_STONE_IMG = img_src_for_white_stone_var.convert_alpha()
    except (pygame.error, FileNotFoundError) as e:
        print(f"Error loading black_stone.png (for B player stones): {e}. Creating placeholder.")
        ORIGINAL_WHITE_STONE_IMG = pygame.Surface((INITIAL_SQUARE_SIZE, INITIAL_SQUARE_SIZE), pygame.SRCALPHA)
        ORIGINAL_WHITE_STONE_IMG.fill((0,0,0,0))
        pygame.draw.circle(ORIGINAL_WHITE_STONE_IMG, (0,0,0), (INITIAL_SQUARE_SIZE//2, INITIAL_SQUARE_SIZE//2), INITIAL_SQUARE_SIZE//2 - 2) # Black circle

    # Board images
    for size_val in [9, 13, 19]:
        try:
            img_board = pygame.image.load(f'{size_val}_by_{size_val}_board.png')
            ORIGINAL_BOARD_IMGS[size_val] = img_board.convert()
        except (pygame.error, FileNotFoundError) as e:
            print(f"Warning: Could not load board image for size {size_val}: {e}")
            ORIGINAL_BOARD_IMGS[size_val] = None

def update_scaled_assets_and_dims(window_width, window_height):
    global SQUARE_SIZE, BORDER_SIZE, BOARD_PIXELS, STONE_RADIUS
    global BLACK_STONE, WHITE_STONE, BLACK_STONE_PREVIEW, WHITE_STONE_PREVIEW, BACKGROUND

    new_square_size_w = window_width // (BOARD_SIZE + 1)
    new_square_size_h = window_height // (BOARD_SIZE + 1)
    SQUARE_SIZE = min(new_square_size_w, new_square_size_h)
    if SQUARE_SIZE < 10: SQUARE_SIZE = 10

    BORDER_SIZE = SQUARE_SIZE // 2
    BOARD_PIXELS = BOARD_SIZE * SQUARE_SIZE
    STONE_RADIUS = SQUARE_SIZE // 2 - 2
    if STONE_RADIUS < 1: STONE_RADIUS = 1

    if ORIGINAL_BLACK_STONE_IMG: # This is the white stone image
        BLACK_STONE = pygame.transform.smoothscale(ORIGINAL_BLACK_STONE_IMG, (SQUARE_SIZE, SQUARE_SIZE))
        BLACK_STONE_PREVIEW = BLACK_STONE.copy()
        BLACK_STONE_PREVIEW.set_alpha(128)
    if ORIGINAL_WHITE_STONE_IMG: # This is the black stone image
        WHITE_STONE = pygame.transform.smoothscale(ORIGINAL_WHITE_STONE_IMG, (SQUARE_SIZE, SQUARE_SIZE))
        WHITE_STONE_PREVIEW = WHITE_STONE.copy()
        WHITE_STONE_PREVIEW.set_alpha(128)

    board_img_to_scale = ORIGINAL_BOARD_IMGS.get(BOARD_SIZE)
    if board_img_to_scale:
        BACKGROUND = pygame.transform.smoothscale(board_img_to_scale, (BOARD_PIXELS, BOARD_PIXELS))
    else:
        BACKGROUND = pygame.Surface((BOARD_PIXELS, BOARD_PIXELS))
        BACKGROUND.fill((210, 180, 140))
        for i in range(BOARD_SIZE):
            line_pos = i * SQUARE_SIZE + SQUARE_SIZE // 2
            pygame.draw.line(BACKGROUND, (0,0,0), (line_pos, 0), (line_pos, BOARD_PIXELS))
            pygame.draw.line(BACKGROUND, (0,0,0), (0, line_pos), (BOARD_PIXELS, line_pos))

class GoBoard:
    def __init__(self):
        self.board = [[' ' for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        self.players = ['B', 'W']
        self.current_player = 0
        self.groups = []
        
    def update_groups(self):
        visited = [[False for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        self.groups = []
        def dfs(x, y, color):
            if not (0 <= x < BOARD_SIZE and 0 <= y < BOARD_SIZE): return set(), set()
            if visited[x][y] or self.board[x][y] != color: return set(), set()
            visited[x][y] = True
            stones = {(x, y)}
            liberties = set()
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < BOARD_SIZE and 0 <= ny < BOARD_SIZE:
                    if self.board[nx][ny] == ' ': liberties.add((nx, ny))
                    elif self.board[nx][ny] == color:
                        s, l = dfs(nx, ny, color)
                        stones |= s
                        liberties |= l
            return stones, liberties
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                if not visited[r][c] and self.board[r][c] != ' ':
                    stones, liberties = dfs(r, c, self.board[r][c])
                    if stones: self.groups.append(Group(self.board[r][c], stones, liberties))

    def make_move(self, r, c):
        if self.board[r][c] != ' ':
            print("Invalid move, the spot is already occupied.")
            return False
        self.board[r][c] = self.players[self.current_player]
        self.update_groups()
        suicide = False
        current_player_char = self.players[self.current_player]
        for group in self.groups:
            if group.player == current_player_char and (r,c) in group.stones and len(group.liberties) == 0:
                suicide = True
                break
        captures_made = False
        captured_groups = [group for group in self.groups if group.player != current_player_char and len(group.liberties) == 0]
        if captured_groups:
            captures_made = True
            for group in captured_groups:
                for stone_r, stone_c in group.stones: self.board[stone_r][stone_c] = ' '
            self.update_groups()
        if suicide and not captures_made:
            self.board[r][c] = ' '
            self.update_groups()
            print("Illegal move, suicide.")
            return False
        print(f"Player {self.players[self.current_player]} placed a stone at ({r+1}, {c+1})")
        self.current_player = (self.current_player + 1) % 2
        return True
    
    def print_groups(self):
        for i, group in enumerate(self.groups, start=1):
            print(f"Group {i} (Player {group.player}): Stones: {sorted(list(group.stones))}, Liberties: {sorted(list(group.liberties))}")

    def draw(self, screen_surface):
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                screen_x = BORDER_SIZE + c * SQUARE_SIZE
                screen_y = BORDER_SIZE + r * SQUARE_SIZE
                if self.board[r][c] == 'B': # Player B (Black) places a stone
                    if WHITE_STONE: # WHITE_STONE is loaded from black_stone.png (black image)
                        screen_surface.blit(WHITE_STONE, (screen_x, screen_y))
                elif self.board[r][c] == 'W': # Player W (White) places a stone
                    if BLACK_STONE: # BLACK_STONE is loaded from white_stone.png (white image)
                        screen_surface.blit(BLACK_STONE, (screen_x, screen_y))

class Group:
    def __init__(self, player, stones=None, liberties=None):
        self.stones = stones if stones is not None else set()
        self.liberties = liberties if liberties is not None else set()
        self.player = player

def main():
    global screen
    pygame.init()
    
    initial_total_width = (BOARD_SIZE + 1) * INITIAL_SQUARE_SIZE
    initial_total_height = (BOARD_SIZE + 1) * INITIAL_SQUARE_SIZE
    screen = pygame.display.set_mode((initial_total_width, initial_total_height), pygame.RESIZABLE)
    pygame.display.set_caption(f"Simple Go - {BOARD_SIZE}x{BOARD_SIZE}")

    load_original_images()
    update_scaled_assets_and_dims(initial_total_width, initial_total_height)

    clock = pygame.time.Clock()
    go_board = GoBoard()
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT: running = False
            elif event.type == pygame.VIDEORESIZE:
                new_width, new_height = event.w, event.h
                if new_width < (BOARD_SIZE + 1) * 10: new_width = (BOARD_SIZE + 1) * 10
                if new_height < (BOARD_SIZE + 1) * 10: new_height = (BOARD_SIZE + 1) * 10
                screen = pygame.display.set_mode((new_width, new_height), pygame.RESIZABLE)
                update_scaled_assets_and_dims(new_width, new_height)
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:
                    mouse_x_abs, mouse_y_abs = event.pos
                    mouse_x_rel_board = mouse_x_abs - BORDER_SIZE
                    mouse_y_rel_board = mouse_y_abs - BORDER_SIZE
                    col_clicked = mouse_x_rel_board // SQUARE_SIZE
                    row_clicked = mouse_y_rel_board // SQUARE_SIZE
                    if 0 <= row_clicked < BOARD_SIZE and 0 <= col_clicked < BOARD_SIZE:
                        if go_board.make_move(row_clicked, col_clicked):
                            go_board.print_groups()

        screen.fill((50, 50, 50))
        if BACKGROUND: screen.blit(BACKGROUND, (BORDER_SIZE, BORDER_SIZE))
        go_board.draw(screen)

        mouse_x_abs, mouse_y_abs = pygame.mouse.get_pos()
        mouse_x_rel_board = mouse_x_abs - BORDER_SIZE
        mouse_y_rel_board = mouse_y_abs - BORDER_SIZE
        preview_col = mouse_x_rel_board // SQUARE_SIZE
        preview_row = mouse_y_rel_board // SQUARE_SIZE

        if 0 <= preview_row < BOARD_SIZE and 0 <= preview_col < BOARD_SIZE and \
           go_board.board[preview_row][preview_col] == ' ':
            preview_stone_img = None
            if go_board.current_player == 0: # Player B's turn (places black stone)
                preview_stone_img = WHITE_STONE_PREVIEW # (translucent black stone image from black_stone.png)
            else: # Player W's turn (places white stone)
                preview_stone_img = BLACK_STONE_PREVIEW # (translucent white stone image from white_stone.png)
            
            if preview_stone_img:
                screen_x = BORDER_SIZE + preview_col * SQUARE_SIZE
                screen_y = BORDER_SIZE + preview_row * SQUARE_SIZE
                screen.blit(preview_stone_img, (screen_x, screen_y))

        pygame.display.flip()
        clock.tick(60)
    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()
