def linear(arr, t):
    for i, el in enumerate(arr):
        if el == t:
            return i
    return -1