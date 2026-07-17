//go:build ignore

// Run this to generate a fresh bcrypt hash for any password:
//   go run ./scripts/gen_hash.go
package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "TrustArmor2026!"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Password : %s\n", password)
	fmt.Printf("Hash     : %s\n", string(hash))

	// Verify it works
	err = bcrypt.CompareHashAndPassword(hash, []byte(password))
	if err != nil {
		fmt.Println("VERIFICATION FAILED:", err)
	} else {
		fmt.Println("Verification: OK ✓")
	}
}
